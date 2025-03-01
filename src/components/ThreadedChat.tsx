import React, { JSX } from 'react';
import { ThreadedChatProps } from '../types/components.types';
import { Message, TokenUsage } from '../types/chat.types';
import { getModelDisplayName } from '../config/modelConfig';
import './ThreadedChat.css';

interface GroupedMessage {
  question: Message;
  responses: Message[];
}

const renderTokenUsage = (usage: TokenUsage): JSX.Element => (
  <div className="token-usage">
    <span>Tokens: {usage.total_tokens}</span>
    <span>(Prompt: {usage.prompt_tokens}, Response: {usage.completion_tokens})</span>
  </div>
);

const MessageContent = ({ message }: { message: Message }) => {
  if (message.role === 'user') {
    return <div className="message-content">{message.content}</div>;
  }

  try {
    const response = JSON.parse(message.content);
    return (
      <div className="message-content assistant-message">
        <div className="response-metadata">
          <div className="model-info">{getModelDisplayName(message.model || '')}</div>
          {response.usage && (
            <div className="usage-info">
              <span>Tokens: {response.usage.total_tokens}</span>
            </div>
          )}
        </div>
        <div className="response-text">{response.response}</div>
      </div>
    );
  } catch (e) {
    return <div className="message-content error">{message.content}</div>;
  }
};

const ThreadedChat: React.FC<ThreadedChatProps> = ({ 
  messages, 
  selectedModels,
  loading,
  layout = 'stacked',
  fullWidth = false
}) => {
  const groupedMessages: GroupedMessage[] = [];
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

  const handleExportThread = (): void => {
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

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num);
  };

  const calculateTotalTokens = (): TokenUsage => {
    const total: TokenUsage = {
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
              <div className="message-content">
                {typeof group.question.content === 'object' 
                  ? JSON.stringify(group.question.content) 
                  : group.question.content}
              </div>
              {group.question.usage && renderTokenUsage(group.question.usage)}
            </div>
            
            <div className={`responses ${layout}`}>
              {group.responses.map((response, rIndex) => (
                <div key={rIndex} className="message assistant">
                  <div className="model-name">{response.model}</div>
                  <div className="message-content">
                    {typeof response.content === 'object' 
                      ? JSON.stringify(response.content) 
                      : response.content}
                  </div>
                  {response.usage && renderTokenUsage(response.usage)}
                </div>
              ))}
              {Object.entries(loading).map(([model, isLoading]) => 
                isLoading && (
                  <div key={model} className="message assistant loading">
                    <div className="model-name">{model}</div>
                    <div className="loading-indicator">Loading...</div>
                  </div>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ThreadedChat; 
