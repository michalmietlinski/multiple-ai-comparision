/**
 * messages.types.ts - Shared type definitions for messages and threads
 * 
 * This file contains shared type definitions used across both client and server code
 * for message and thread-related functionality.
 */

/**
 * Token usage information for a message
 * 
 * Tracks the number of tokens used in both prompt and completion,
 * as well as the total token count.
 */
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/**
 * Chat usage information (alias for TokenUsage)
 * 
 * This interface is provided for backward compatibility with code
 * that uses the ChatUsage name instead of TokenUsage.
 */
export interface ChatUsage extends TokenUsage {}

/**
 * Base message structure used in all conversations
 * 
 * Represents a single message in a conversation, which can be from
 * a user, assistant, or system.
 */
export interface BaseMessage {
  /** The role of the message sender (user, assistant, or system) */
  role: 'user' | 'assistant' | 'system';
  
  /** The content of the message */
  content: string;
  
  /** Optional model identifier that generated this message (for assistant messages) */
  model?: string;
  
  /** Timestamp when the message was created */
  timestamp: string;
  
  /** Optional token usage statistics */
  usage?: TokenUsage | null;
}

/**
 * Thread message structure containing a user message and array of responses
 * 
 * Represents a complete conversation turn, including the user's message
 * and all AI responses to that message.
 */
export interface ThreadMessage {
  /** The user's message that initiated this conversation turn */
  userMessage: BaseMessage;
  
  /** Array of AI responses to the user's message */
  responses: BaseMessage[];
  
  /** Timestamp when this conversation turn was created */
  timestamp: string;
  
  /** Optional aggregated token usage for all responses */
  usage?: TokenUsage | null;
}

/**
 * Legacy message format for backward compatibility
 * 
 * Used to support older parts of the application that haven't
 * been updated to use the new message structure.
 * 
 * @deprecated Use BaseMessage instead
 */
export interface LegacyMessage {
  role: "user" | "assistant";
  content: string;
  model?: string;
  usage?: TokenUsage;
  timestamp?: string;
}

/**
 * Thread state containing messages and metadata
 * 
 * Represents the complete state of a conversation thread,
 * including all messages and thread metadata.
 */
export interface ThreadState {
  /** Unique identifier for the thread */
  id: string;
  
  /** Array of model identifiers used in this thread */
  models: string[];
  
  /** Whether the thread is currently active */
  isActive?: boolean;
  
  /** Timestamp when the thread was last updated */
  updatedAt: string;
  
  /** Timestamp when the thread was created */
  createdAt: string;
  
  /** Array of all messages in the thread */
  messages: ThreadMessage[];
}

/**
 * Extended thread state with combined messages
 * 
 * Extends the base ThreadState with an optional array of combined messages,
 * which are used for displaying the thread in a combined format.
 */
export interface ThreadStateWithCombinedMessages extends ThreadState {
  /** Optional array of combined messages for display purposes */
  combinedMessages?: ThreadMessage[];
}

/**
 * Chat response from a single model
 * 
 * Represents a response from a single AI model to a user's message.
 */
export interface ChatResponse {
  /** Identifier of the model that generated this response */
  model: string;
  
  /** The text content of the response */
  response: string;
  
  /** Optional token usage statistics */
  usage?: TokenUsage | null;
}

/**
 * Grouped message format for legacy support
 * 
 * Used to support older parts of the application that use
 * a question-responses structure.
 * 
 * @deprecated Use ThreadMessage instead
 */
export interface GroupedMessage {
  /** The user's question */
  question: LegacyMessage;
  
  /** Array of AI responses to the question */
  responses: LegacyMessage[];
}

/**
 * Thread history for displaying in UI
 * 
 * Represents a simplified view of a thread for display in the UI,
 * particularly in history panels.
 */
export interface ThreadHistory {
  /** Unique identifier for the thread */
  id: string;
  
  /** Array of messages in the thread */
  messages: ThreadMessage[];
  
  /** Timestamp when the thread was created or last updated */
  timestamp: string;
  
  /** Optional prompt text that initiated the thread */
  prompt?: string;
}

/**
 * Type guard to check if a message is a ThreadMessage
 */
export function isThreadMessage(message: any): message is ThreadMessage {
  return (
    message &&
    typeof message === 'object' &&
    'userMessage' in message &&
    'responses' in message &&
    Array.isArray(message.responses)
  );
}

/**
 * Type guard to check if a message is a LegacyMessage
 */
export function isLegacyMessage(message: any): message is LegacyMessage {
  return (
    message &&
    typeof message === 'object' &&
    'role' in message &&
    'content' in message &&
    (message.role === 'user' || message.role === 'assistant')
  );
}

/**
 * Convert a LegacyMessage to a BaseMessage
 */
export function convertLegacyToBaseMessage(message: LegacyMessage): BaseMessage {
  return {
    role: message.role,
    content: message.content,
    model: message.model,
    timestamp: message.timestamp || new Date().toISOString(),
    usage: message.usage || null
  };
} 
