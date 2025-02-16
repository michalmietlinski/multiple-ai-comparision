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

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  const calculateTotalTokens = () => {
    let total = {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    };

    messages.forEach(msg => {
      if (msg.usage) {
        total.prompt_tokens += msg.usage.prompt_tokens;
        total.completion_tokens += msg.usage.completion_tokens;
        total.total_tokens += msg.usage.total_tokens;
      }
    });

    return total;
  };

  const renderTokenUsage = (usage) => {
    if (!usage) return null;
    return (
      <div className="token-usage">
        <div className="token-stat">
          <span className="token-label">Prompt:</span>
          <span className="token-value">{formatNumber(usage.prompt_tokens)}</span>
        </div>
        <div className="token-stat">
          <span className="token-label">Response:</span>
          <span className="token-value">{formatNumber(usage.completion_tokens)}</span>
        </div>
        <div className="token-stat">
          <span className="token-label">Total:</span>
          <span className="token-value">{formatNumber(usage.total_tokens)}</span>
        </div>
      </div>
    );
  };

  const totalTokens = calculateTotalTokens();

  return (
    <div className={`threaded-chat ${layout} ${fullWidth ? 'full-width' : ''}`}>
      {messages.length > 0 && (
        <div className="chat-header">
          <div className="header-content">
            <h3>Conversation</h3>
            {totalTokens.total_tokens > 0 && (
              <div className="conversation-tokens">
                Total Tokens: {formatNumber(totalTokens.total_tokens)} 
                (Prompt: {formatNumber(totalTokens.prompt_tokens)}, 
                Response: {formatNumber(totalTokens.completion_tokens)})
              </div>
            )}
          </div>
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
                  {response.usage && renderTokenUsage(response.usage)}
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
