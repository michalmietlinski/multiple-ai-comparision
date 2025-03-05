import React from 'react';
import { ThreadMessage } from '../shared/types/messages.types';
import { ThreadHistoryPanelProps } from '../shared/types/components.types';
import './ThreadHistoryPanel.css';

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

  const getFirstUserMessage = (messages: ThreadMessage[]): string => {
    if (!Array.isArray(messages) || messages.length === 0) return 'No prompt';
    const firstMessage = messages[0];
    if (!firstMessage || !firstMessage.userMessage) return 'No prompt';
    return firstMessage.userMessage.content;
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
            <button 
              className="clear-all-button"
              onClick={clearAllThreads}
              disabled={safeThreads.length === 0}
            >
              Clear All
            </button>
          </div>
          
          {threadsLoading ? (
            <div className="loading-threads">Loading threads...</div>
          ) : safeThreads.length === 0 ? (
            <div className="no-threads">No threads found</div>
          ) : (
            <ul className="thread-list">
              {safeThreads.map((thread) => (
                <li key={thread.id} className="thread-item">
                  <div className="thread-info">
                    <div className="thread-date">{formatDate(thread.updatedAt || thread.createdAt)}</div>
                    <div className="thread-models">
                      Models: {thread.models.join(', ')}
                    </div>
                    <div className="thread-prompt">
                      {truncateText(getFirstUserMessage(thread.messages))}
                    </div>
                  </div>
                  <div className="thread-actions">
                    <button
                      className="load-thread"
                      onClick={() => loadThread(thread.id)}
                    >
                      Load
                    </button>
                    <button
                      className="delete-thread"
                      onClick={() => deleteThread(thread.id)}
                      disabled={deletingThreads[thread.id]}
                    >
                      {deletingThreads[thread.id] ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default ThreadHistoryPanel;
