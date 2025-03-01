import React from 'react';
import { ThreadState } from '../types/chat.types';
import './ThreadHistoryPanel.css';

interface ThreadHistoryPanelProps {
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  threads: ThreadState[];
  threadsLoading: boolean;
  loadThread: (threadId: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  clearAllThreads: () => Promise<void>;
  deletingThreads: Record<string, boolean>;
}

const ThreadHistoryPanel: React.FC<ThreadHistoryPanelProps> = ({
  showHistory,
  setShowHistory,
  threads = [],
  threadsLoading,
  loadThread,
  deleteThread,
  clearAllThreads,
  deletingThreads,
}) => {
  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getFirstUserMessage = (messages: any[]): string => {
    if (!Array.isArray(messages)) return 'No prompt';
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (!firstUserMessage) return 'No prompt';
    return firstUserMessage.content;
  };

  const truncateText = (text: string, maxLength = 100): string => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const safeThreads = Array.isArray(threads) 
    ? threads.filter(thread => thread && thread.id)
    : [];

  return (
    <div className="thread-history">
      <button
        className={`toggle-history ${showHistory ? 'active' : ''}`}
        onClick={() => setShowHistory(!showHistory)}
      >
        {showHistory ? 'Hide History' : 'Show History'}
      </button>

      {showHistory && (
        <div className="history-panel">
          <div className="history-header">
            <h3>Thread History</h3>
            {safeThreads.length > 0 && (
              <button
                className="clear-history"
                onClick={clearAllThreads}
              >
                Clear All
              </button>
            )}
          </div>

          {threadsLoading ? (
            <div className="loading">Loading threads...</div>
          ) : safeThreads.length === 0 ? (
            <div className="no-threads">No saved threads</div>
          ) : (
            <div className="thread-list">
              {safeThreads.map((thread) => (
                <div key={thread.id} className="thread-item">
                  <div className="thread-info">
                    <div className="thread-prompt">
                      {truncateText(getFirstUserMessage(thread.messages || []))}
                    </div>
                    <div className="thread-metadata">
                      <span className="thread-date">
                        {formatDate(thread.updatedAt || new Date().toISOString())}
                      </span>
                      <span className={`thread-status ${thread.isActive ? 'active' : 'inactive'}`}>
                        {thread.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="thread-models">
                      Models: {Array.isArray(thread.models) ? thread.models.map(model => model.split('/').pop()).join(', ') : 'None'}
                    </div>
                    <div className="message-count">
                      Messages: {Array.isArray(thread.messages) ? thread.messages.length : 0}
                    </div>
                  </div>
                  <div className="thread-actions">
                    <button
                      onClick={() => loadThread(thread.id)}
                      className="load-thread"
                      title="Load this thread"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deleteThread(thread.id)}
                      className={`delete-thread ${deletingThreads[thread.id] ? 'deleting' : ''}`}
                      disabled={deletingThreads[thread.id]}
                      title="Delete this thread"
                    >
                      {deletingThreads[thread.id] ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ThreadHistoryPanel;
