import React from 'react';
import './ThreadedChat.css';

function ThreadedChat({ 
  messages, 
  selectedModels,
  loading,
  layout = 'stacked',
  fullWidth = false
}) {
  const groupedMessages = [];
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === 'user') {
      const responses = messages
        .slice(i + 1, i + 1 + selectedModels.length)
        .filter(m => m.role === 'assistant');
      groupedMessages.push({
        question: messages[i],
        responses
      });
      i += selectedModels.length;
    }
  }

  const handleExportThread = () => {
    const exportData = {
      messages,
      models: selectedModels,
      timestamp: new Date().toISOString()
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `conversation-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`threaded-chat ${layout} ${fullWidth ? 'full-width' : ''}`}>
      {messages.length > 0 && (
        <div className="chat-header">
          <h3>Conversation</h3>
          <button 
            className="export-thread"
            onClick={handleExportThread}
            title="Export entire conversation"
          >
            Export Conversation
          </button>
        </div>
      )}
      <div className="chat-messages">
        {[...groupedMessages].reverse().map((group, index) => (
          <div key={index} className="conversation-turn">
            <div className="message user">
              <div className="message-content">{group.question.content}</div>
            </div>
            
            <div className={`responses ${layout}`}>
              {group.responses.map((response, rIndex) => (
                <div key={rIndex} className="message assistant">
                  <div className="model-name">{response.model}</div>
                  <div className="message-content">{response.content}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ThreadedChat; 
