/**
 * @deprecated This file is deprecated. Use shared types from src/shared/types/messages.types.ts instead.
 * 
 * This file will be removed in a future update. All types have been moved to the shared directory
 * to eliminate duplication and ensure consistency across the codebase.
 */

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  model?: string;
  usage?: TokenUsage;
  timestamp?: string;
}

export interface ChatResponse {
  model: string;
  response: string;
  usage?: TokenUsage;
}

export interface GroupedMessage {
  question: Message;
  responses: Message[];
}

export interface ThreadHistory {
  id: string;
  messages: Message[];
  timestamp: string;
  prompt?: string;
}

// New message structure
export interface BaseMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  timestamp: string;
  usage?: TokenUsage | null;
}

export interface ThreadMessage {
  userMessage: BaseMessage;
  responses: BaseMessage[];
  timestamp: string;
  usage?: TokenUsage | null;
}

export interface ThreadState {
  id: string;
  models: string[];
  isActive: boolean;
  updatedAt: string;
  createdAt: string;
  messages: ThreadMessage[];
}

export interface ThreadStateWithCombinedMessages extends ThreadState {
  combinedMessages?: ThreadMessage[];
}
