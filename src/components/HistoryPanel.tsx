import React from 'react';
import { HistoryPanelProps } from '../types/components.types';
import { ExportData } from '../types/storage.types';
import './HistoryPanel.css';

const HistoryPanel: React.FC<HistoryPanelProps> = ({ 
  showHistory, 
  setShowHistory, 
  logs, 
  logsLoading, 
  loadConversation, 
  deleteConversation, 
  clearAllHistory,
  deletingLogs 
}) => {
  const handleExportHistory = (log: { prompt: string; responses: Record<string, string>; timestamp: string; fileName: string }): void => {
    const exportData: ExportData = {
      prompt: log.prompt,
      responses: log.responses,
      timestamp: log.timestamp,
      fileName: log.fileName
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `history-${log.fileName}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="history-toggle-container">
        <button 
          className="history-toggle"
          onClick={() => setShowHistory(!showHistory)}
        >
          {showHistory ? 'Hide History' : 'Show History'}
        </button>
      </div>

      <div className={`history-panel ${showHistory ? 'show' : ''}`}>
        <div className="history-header">
          <h3>History</h3>
          <button onClick={() => setShowHistory(false)} className="close-history">×</button>
        </div>
        
        {logsLoading ? (
          <div className="history-loading">Loading history...</div>
        ) : (
          <>
            {logs.length > 0 && (
              <div className="history-actions">
                <button onClick={clearAllHistory} className="clear-history">
                  Clear All History
                </button>
              </div>
            )}
            <div className="history-list">
              {logs.map(log => (
                <div 
                  key={log.fileName} 
                  className="history-item"
                  onClick={() => loadConversation(log)}
                >
                  <div className="history-item-content">
                    <div className="history-prompt">{log.prompt}</div>
                    <div className="history-meta">
                      <span className="history-date">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                      <div className="history-controls">
                        <button
                          className="export-history"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportHistory(log);
                          }}
                          title="Export this conversation"
                        >
                          Export
                        </button>
                        <button
                          className="delete-history"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(log.date, log.fileName, e);
                          }}
                          disabled={deletingLogs[log.fileName]}
                        >
                          {deletingLogs[log.fileName] ? 'Deleting...' : '×'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="no-history">No history yet</div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default HistoryPanel; 
