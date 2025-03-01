import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import ComparisonForm from './ComparisonForm';
import ThreadedChat from './ThreadedChat';
import ThreadHistoryPanel from './ThreadHistoryPanel';
import { Message, ThreadHistory, ThreadState, ThreadMessage } from '../types/chat.types';
import { Model } from '../types/api.types';
import { getModelDisplayName } from '../config/modelConfig';
import { ThreadService } from '../services/threadService';
import './ThreadedComparison.css';

interface ThreadedComparisonProps {
  currentPrompt: string;
  setCurrentPrompt: (prompt: string) => void;
}

interface ApiModel {
  id: string;
  name: string;
}

// Add type declaration for uuid
declare module 'uuid' {
  export function v4(): string;
}

const ThreadedComparison: React.FC<ThreadedComparisonProps> = ({ currentPrompt, setCurrentPrompt }) => {
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [modelsLocked, setModelsLocked] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [threads, setThreads] = useState<ThreadState[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [deletingThreads, setDeletingThreads] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chatLayout, setChatLayout] = useState<'stacked' | 'grid'>('stacked');
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [currentThread, setCurrentThread] = useState<ThreadState | null>(null);

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
    updateUrlWithThreadId(null);
  }, []);

  const fetchThreads = useCallback(async (): Promise<void> => {
    try {
      setThreadsLoading(true);
      const response = await ThreadService.listThreads();
      // Ensure we have a valid array of threads
      const validThreads = Array.isArray(response) ? response : [];
      setThreads(validThreads);
    } catch (error) {
      console.error('Error fetching threads:', error);
      setThreads([]);
    } finally {
      setThreadsLoading(false);
    }
  }, []);

  const loadThread = useCallback(async (threadId: string): Promise<void> => {
    try {
      setThreadsLoading(true);
      const threadState = await ThreadService.getThread(threadId);
      
      if (!threadState || !threadState.messages.length) {
        throw new Error('Invalid thread data received');
      }

      setCurrentThread(threadState);
      setSelectedModels(threadState.mapping.models);
      setMessages(threadState.messages);
      setModelsLocked(true);
      setShowHistory(false);
      updateUrlWithThreadId(threadId);
      
    } catch (error: any) {
      console.error('Error loading thread:', error);
      if (error.response?.status === 404) {
        setThreads(prev => prev.filter(t => t.mapping.localThreadId !== threadId));
      }
      alert('Failed to load thread. The thread may have been deleted or is invalid.');
      clearForm();
      await fetchThreads();
    } finally {
      setThreadsLoading(false);
    }
  }, [clearForm, fetchThreads]);

  // Save thread whenever messages change
  useEffect(() => {
    const saveThread = async () => {
      const threadId = getThreadIdFromUrl();
      if (threadId && messages.length > 0) {
        try {
          await axios.post(`http://localhost:3001/api/threads/${threadId}`, {
            messages,
            models: selectedModels
          });
          fetchThreads(); // Refresh thread list after saving
        } catch (error) {
          console.error('Error saving thread:', error);
        }
      }
    };
    saveThread();
  }, [messages, selectedModels]);

  // Load thread on mount and URL change
  useEffect(() => {
    const handleUrlChange = async () => {
      const threadId = getThreadIdFromUrl();
      if (threadId) {
        await loadThread(threadId);
      } else {
        clearForm();
      }
    };

    // Initial load
    handleUrlChange();

    // Listen for popstate events (browser back/forward)
    const handlePopState = (event: PopStateEvent) => {
      handleUrlChange();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [clearForm, loadThread]);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setModelsLoading(true);
        const response = await axios.get('http://localhost:3001/api/models');
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

  useEffect(() => {
    fetchThreads();
  }, []);

  useEffect(() => {
    if (currentPrompt) {
      setPrompt(currentPrompt);
      setCurrentPrompt('');
    }
  }, [currentPrompt, setCurrentPrompt]);

  const formatModelName = (modelId: string): string => {
    return getModelDisplayName(modelId);
  };

  const handleModelToggle = (modelId: string): void => {
    if (!modelsLocked) {
      setSelectedModels(prev => 
        prev.includes(modelId)
          ? prev.filter(id => id !== modelId)
          : [...prev, modelId]
      );
    }
  };

  const handleSubmit = async (data: { responses: Record<string, string> }): Promise<void> => {
    try {
      let threadState = currentThread;
      
      // Create local thread on first message
      if (!threadState) {
        // For first message, just create a local thread without OpenAI
        const localThreadId = uuidv4();
        threadState = {
          mapping: {
            localThreadId,
            openAIThreadId: null,
            models: selectedModels,
            isActive: true,
            lastUpdated: new Date().toISOString()
          },
          messages: []
        };
        setCurrentThread(threadState);
        updateUrlWithThreadId(threadState.mapping.localThreadId);
        setModelsLocked(true);
      }

      // Create OpenAI thread on second message if it doesn't exist
      if (threadState.messages.length > 0 && !threadState.mapping.openAIThreadId) {
        threadState = await ThreadService.createThread(selectedModels);
        setCurrentThread(threadState);
        updateUrlWithThreadId(threadState.mapping.localThreadId);
      }

      selectedModels.forEach(model => {
        setLoading(prev => ({ ...prev, [model]: true }));
      });

      if (data.responses) {
        const newMessages = await ThreadService.sendMessage(
          threadState.mapping.localThreadId,
          prompt
        );

        setMessages(newMessages);
        setPrompt('');
        await fetchThreads();
      }
    } catch (error) {
      console.error('Error:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      selectedModels.forEach(model => {
        setLoading(prev => ({ ...prev, [model]: false }));
      });
    }
  };

  const deleteThread = useCallback(async (threadId: string): Promise<void> => {
    try {
      setDeletingThreads(prev => ({ ...prev, [threadId]: true }));
      
      await ThreadService.deleteThread(threadId);
      setThreads(prev => prev.filter(t => t.mapping.localThreadId !== threadId));
      
      if (currentThread?.mapping.localThreadId === threadId) {
        setCurrentThread(null);
        clearForm();
      }
      
      await fetchThreads();
    } catch (error: any) {
      console.error('Error deleting thread:', error);
      if (error.response?.status === 404) {
        setThreads(prev => prev.filter(t => t.mapping.localThreadId !== threadId));
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
