import React, { JSX } from 'react';
import './ThreadedChat.css';
import { getModelDisplayName } from '../config/modelConfig';
import { 
  ThreadMessage, 
  BaseMessage,
  ChatUsage
} from '../shared/types/messages.types';
import { ThreadedChatProps } from '../shared/types/components.types';

const renderTokenUsage = (usage: ChatUsage): JSX.Element => (
  <div className="token-usage">
    <span>Tokens: {usage.total_tokens}</span>
    <span>(Prompt: {usage.prompt_tokens}, Response: {usage.completion_tokens})</span>
  </div>
);

const MessageContent = ({ message }: { message: BaseMessage }) => {
  if (!message) {
    return <div className="message-content error">Invalid message data</div>;
  }

  if (message.role === 'user') {
    return <div className="message-content">{message.content || ''}</div>;
  }

  try {
    // Try to parse as JSON first (for backward compatibility)
    let displayContent = message.content || '';
    let usage = message.usage;
    
    try {
      if (typeof message.content === 'string') {
        const parsed = JSON.parse(message.content);
        if (parsed && parsed.response) {
          displayContent = parsed.response;
          if (parsed.usage) {
            usage = parsed.usage;
          }
        }
      }
    } catch (e) {
      // Not JSON, use as is
    }
    
    return (
      <div className="message-content assistant-message">
        <div className="response-metadata">
          <div className="model-info">{getModelDisplayName(message.model || '')}</div>
          
        </div>
        <div className="response-text">{displayContent}</div>
      </div>
    );
  } catch (e) {
    return <div className="message-content error">{message.content || 'Error displaying message'}</div>;
  }
};

const ThreadedChat: React.FC<ThreadedChatProps> = ({ 
  messages, 
  selectedModels,
  loading,
  layout = 'stacked',
  fullWidth = false
}) => {
  // Group messages by conversation turn
  const groupedMessages = Array.isArray(messages) ? messages.map((message) => ({
    question: message?.userMessage || null,
    responses: message?.responses || []
  })) : [];

  const calculateTotalTokens = () => {
    const total = {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    };

    if (!messages || !Array.isArray(messages)) {
      return total;
    }

    messages.forEach(msg => {
      // Add user message usage if available
      if (msg && msg.userMessage && msg.userMessage.usage) {
        total.prompt_tokens += msg.userMessage.usage.prompt_tokens || 0;
        total.completion_tokens += msg.userMessage.usage.completion_tokens || 0;
        total.total_tokens += msg.userMessage.usage.total_tokens || 0;
      }
      
      // Add all response usages
      if (msg && msg.responses && Array.isArray(msg.responses)) {
        msg.responses.forEach((response: BaseMessage) => {
          if (response && response.usage) {
            total.prompt_tokens += response.usage.prompt_tokens || 0;
            total.completion_tokens += response.usage.completion_tokens || 0;
            total.total_tokens += response.usage.total_tokens || 0;
          }
        });
      }
    });

    return total;
  };

  const totalTokens = calculateTotalTokens();

  return (
    <div className={`threaded-chat ${fullWidth ? 'full-width' : ''}`}>
      <div className="token-summary">
        Total tokens: {totalTokens.total_tokens} (Prompt: {totalTokens.prompt_tokens}, Response: {totalTokens.completion_tokens})
      </div>
      
      <div className="chat-messages">
        {groupedMessages.reverse().map((group, groupIndex) => (
          <div key={`group-${groupIndex}`} className="conversation-turn">
            {group.question && (
              <div className="message user">
                <div className="message-header">
                  <div className="message-role">User</div>
                  <div className="message-timestamp">
                    {group.question.timestamp ? new Date(group.question.timestamp).toLocaleString() : ''}
                  </div>
                </div>
                <MessageContent message={group.question} />
              </div>
            )}
            
            {Array.isArray(group.responses) && group.responses.length > 0 && (
              <div className={`responses ${layout}`}>
                {group.responses.map((response: BaseMessage, responseIndex: number) => (
                  <div 
                    key={`response-${groupIndex}-${responseIndex}`} 
                    className={`message assistant ${response && response.model && loading[response.model] ? 'loading' : ''}`}
                  >
                    
                    {response && response.model && loading[response.model] ? (
                      <div className="loading-indicator">Generating response...</div>
                    ) : (
                      <MessageContent message={response} />
                    )}
                    
                    {response && response.usage && renderTokenUsage(response.usage)}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ThreadedChat; 
