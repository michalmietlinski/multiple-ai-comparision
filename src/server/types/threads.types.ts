import { ThreadMessage as BaseThreadMessage } from './api.types.js';

export interface Thread {
  id: string;
  openAIThreadId?: string | null;
  messages: ThreadMessage[];
  models: string[];
  createdAt: string;
  updatedAt: string;
}

export type ThreadMessage = BaseThreadMessage;

export interface ThreadsListResponse {
  threads: Thread[];
}

export interface ThreadChatRequest {
  threadId?: string;
  prompt: string;
  models: string[];
  previousMessages?: ThreadMessage[];
}

export interface ChatUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatResponse {
  model: string;
  response: string;
  usage: ChatUsage | null;
}

export interface ThreadChatResponse {
  responses: ChatResponse[];
  threadId: string;
  history: ThreadMessage[];
}

export interface ThreadErrorResponse {
  error: string;
  responses: Array<{
    model: string;
    response: string;
  }>;
}

export interface ThreadParams {
  threadId: string;
}

export interface ThreadSuccessResponse {
  message: string;
}

export interface ThreadState {
	id: string;
	models: string[];
	isActive: boolean;
	updatedAt: string;
	createdAt: string;
	messages: ThreadMessage[];
  }

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  timestamp: string;
  usage?: ChatUsage | null;
} 
