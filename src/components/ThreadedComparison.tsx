import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import ComparisonForm from './ComparisonForm';
import ThreadedChat from './ThreadedChat';
import ThreadHistoryPanel from './ThreadHistoryPanel';
import { Model, ApiModel } from '../shared/types/api.types';
import { 
  ThreadMessage, 
  ThreadStateWithCombinedMessages,
} from '../shared/types/messages.types';
import { getModelDisplayName } from '../config/modelConfig';
import { ThreadService } from '../services/threadService';
import './ThreadedComparison.css';

const API_BASE = 'http://localhost:3001/api';

interface ThreadedComparisonProps {
  currentPrompt: string;
  setCurrentPrompt: (prompt: string) => void;
}

// Add type declaration for uuid
declare module 'uuid' {
  export function v4(): string;
}

// Define a local interface that extends the shared Model type to include any additional properties needed
interface ExtendedModel extends Model {
  apiId?: string; // Add this property to satisfy the legacy Model type
}

const ThreadedComparison: React.FC<ThreadedComparisonProps> = ({ currentPrompt, setCurrentPrompt }) => {
  const [availableModels, setAvailableModels] = useState<ExtendedModel[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [modelsLocked, setModelsLocked] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [threads, setThreads] = useState<ThreadStateWithCombinedMessages[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [deletingThreads, setDeletingThreads] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chatLayout, setChatLayout] = useState<'stacked' | 'grid'>('stacked');
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [currentThread, setCurrentThread] = useState<ThreadStateWithCombinedMessages | null>(null);

  // Get threadId from URL
  const getThreadIdFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('threadId');
  };

  // Update URL with threadId
  const updateUrlWithThreadId = (threadId: string | null) => {
    const url = new URL(window.location.href);
    if (threadId) {
      url.searchParams.set('threadId', threadId);
    } else {
      url.searchParams.delete('threadId');
    }
    window.history.pushState({ threadId }, '', url);
  };

  const clearForm = useCallback(() => {
    setPrompt('');
    setSelectedModels([]);
    setMessages([]);
    setModelsLocked(false);
    setCurrentThread(null);
    updateUrlWithThreadId(null);
  }, []);

  const fetchThreads = useCallback(async (): Promise<void> => {
    try {
      setThreadsLoading(true);
      const response = await ThreadService.listThreads();
      const validThreads = Array.isArray(response) ? response : [];
	  setThreads(validThreads);
	  console.log('[ThreadedComparison] Threads fetched:', validThreads);
    } catch (error) {
      console.error('[ThreadedComparison] Error fetching threads:', error);
      setThreads([]);
    } finally {
      setThreadsLoading(false);
    }
  }, []);

  const formatModelName = (modelId: string): string => {
    return getModelDisplayName(modelId);
  };
  useEffect(() => {
    const fetchModels = async () => {
      try {
        setModelsLoading(true);
        const response = await axios.get(`${API_BASE}/models`);
        const models = response.data.map((model: ApiModel) => ({
          id: model.id,
          name: formatModelName(model.id)
        }));
        setAvailableModels(models);
      } catch (error) {
        console.error('Error fetching models:', error);
        setModelsError('Failed to load available models');
      } finally {
        setModelsLoading(false);
      }
    };

    fetchModels();
  }, []);

  const loadThread = useCallback(async (threadId: string) => {
    console.log(`Loading thread ${threadId}`);
    try {
      const thread = await ThreadService.getThread(threadId);
      if (thread) {
        console.log(`Thread loaded with ${thread.messages.length} messages and models:`, thread.models);
        // Batch state updates
        ReactDOM.unstable_batchedUpdates(() => {
          setCurrentThread(thread);
          setSelectedModels(thread.models);
          setMessages(thread.messages);
          setModelsLocked(true);
          updateUrlWithThreadId(thread.id);
        });
      }
    } catch (error) {
      console.error('Error loading thread:', error);
    }
  }, []);

  useEffect(() => {
    const handleUrlChange = async () => {
      const threadId = getThreadIdFromUrl();
      if (threadId && currentThread?.id !== threadId) {
        await loadThread(threadId);
      } else {
        clearForm();
      }
    };

    handleUrlChange();
    const handlePopState = (event: PopStateEvent) => {
      handleUrlChange();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [clearForm, loadThread]);

  useEffect(() => {
    fetchThreads();
  }, []);

  useEffect(() => {
    if (currentPrompt) {
      setPrompt(currentPrompt);
      setCurrentPrompt('');
    }
  }, [currentPrompt, setCurrentPrompt]);

  const handleModelToggle = (modelId: string): void => {
    if (!modelsLocked) {
      setSelectedModels(prev => 
        prev.includes(modelId)
          ? prev.filter(id => id !== modelId)
          : [...prev, modelId]
      );
    }
  };

  const handleSubmit = async (): Promise<void> => {
    try {
      console.log('[ThreadedComparison] Handling submit:', {
        hasCurrentThread: !!currentThread,
        selectedModels,
        promptLength: prompt.length
      });

      let threadState = currentThread;
      console.log('[ThreadedComparison] Current thread:', threadState);
      
      // Always create new thread if no current thread or after form clear
      if (!threadState || !threadState.id) {
        console.log('[ThreadedComparison] Creating new thread...');
        threadState = await ThreadService.createThread(selectedModels);
        console.log('[ThreadedComparison] New thread created:', threadState.id);
        setCurrentThread(threadState);
        updateUrlWithThreadId(threadState.id);
        setModelsLocked(true);
      }

      // Set loading state for all selected models
      selectedModels.forEach(model => {
        setLoading(prev => ({ ...prev, [model]: true }));
      });

      console.log('[ThreadedComparison] Sending message to thread:', threadState.id);
      const newMessages = await ThreadService.sendMessage(
        threadState.id,
        prompt,
        selectedModels
      );
      
      console.log('[ThreadedComparison] Received messages:', newMessages.length);
      
      // Update messages state with the new messages
      setMessages(newMessages);
      setPrompt('');
      
      // Refresh thread list to show updated thread
      await fetchThreads();
      
      // Also reload the current thread to ensure we have the latest data
      if (threadState && threadState.id) {
        await loadThread(threadState.id);
      }

      // Reset loading state for all selected models
      selectedModels.forEach(model => {
        setLoading(prev => ({ ...prev, [model]: false }));
      });
    } catch (error) {
      console.error('[ThreadedComparison] Error in handleSubmit:', error);
      selectedModels.forEach(model => {
        setLoading(prev => ({ ...prev, [model]: false }));
      });
    }
  };

  const deleteThread = useCallback(async (threadId: string): Promise<void> => {
    try {
      setDeletingThreads(prev => ({ ...prev, [threadId]: true }));
      
      await ThreadService.deleteThread(threadId);
      setThreads(prev => prev.filter(t => t.id !== threadId));
      
      if (currentThread?.id === threadId) {
        setCurrentThread(null);
        clearForm();
      }
      
      await fetchThreads();
    } catch (error: any) {
      console.error('Error deleting thread:', error);
      if (error.response?.status === 404) {
        setThreads(prev => prev.filter(t => t.id !== threadId));
      } else {
        alert('Failed to delete thread. Please try again.');
        await fetchThreads();
      }
    } finally {
      setDeletingThreads(prev => ({ ...prev, [threadId]: false }));
    }
  }, [clearForm, fetchThreads, currentThread]);

  const clearAllThreads = async (): Promise<void> => {
    if (window.confirm('Are you sure you want to clear all threads? This cannot be undone.')) {
      try {
        await ThreadService.clearAllThreads();
        setThreads([]);
        setCurrentThread(null);
        clearForm();
      } catch (error) {
        console.error('Error clearing threads:', error);
        alert('Failed to clear all threads. Please try again.');
      }
    }
  };

  return (
    <div className={`threaded-comparison ${isFullWidth ? 'full-width' : ''}`}>
      <h1>Threaded Model Comparison</h1>
      
      <div className="chat-controls">
        <label>
          <input
            type="checkbox"
            checked={isFullWidth}
            onChange={(e) => setIsFullWidth(e.target.checked)}
          />
          Full Width
        </label>
        
        <div className="layout-toggle">
          <label>
            <input
              type="radio"
              name="layout"
              value="stacked"
              checked={chatLayout === 'stacked'}
              onChange={(e) => setChatLayout(e.target.value as 'stacked' | 'grid')}
            />
            Stacked
          </label>
          <label>
            <input
              type="radio"
              name="layout"
              value="grid"
              checked={chatLayout === 'grid'}
              onChange={(e) => setChatLayout(e.target.value as 'stacked' | 'grid')}
            />
            Side by Side
          </label>
        </div>
      </div>

      <ThreadHistoryPanel
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        threads={threads}
        threadsLoading={threadsLoading}
        loadThread={loadThread}
        deleteThread={deleteThread}
        clearAllThreads={clearAllThreads}
        deletingThreads={deletingThreads}
      />

      <ComparisonForm
        prompt={prompt}
        setPrompt={setPrompt}
        handleSubmit={handleSubmit}
        selectedModels={selectedModels}
        availableModels={availableModels}
        handleModelToggle={handleModelToggle}
        modelsLoading={modelsLoading}
        modelsError={modelsError}
        clearForm={clearForm}
        isSubmitting={isSubmitting}
        setIsSubmitting={setIsSubmitting}
        modelsLocked={modelsLocked}
        history={messages}
        setHistory={setMessages}
      />

      {messages.length > 0 && (
        <ThreadedChat
          messages={messages}
          selectedModels={selectedModels}
          loading={loading}
          layout={chatLayout}
          fullWidth={isFullWidth}
        />
      )}
    </div>
  );
};

export default ThreadedComparison;
