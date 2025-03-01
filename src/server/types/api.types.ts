import { Request } from 'express';
import { ChatUsage } from './threads.types.js';

export interface ApiModel {
  id: string;
  name: string;
  provider: string;
  active: boolean;
}

export interface ApiProvider {
  id: string;
  name: string;
  provider: string;
  key: string;
  url?: string;
  active: boolean;
  models?: string[];
}
export interface baseMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
	model?: string;
	timestamp: string;
	usage?: ChatUsage | null;
}
 export interface ThreadMessage {
  userMessage: baseMessage;
  responses: baseMessage[],
  model?: string;
  timestamp: string;
  usage?: ChatUsage | null;
}

export interface Thread {
  id: string;
  messages: ThreadMessage[];
  models: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SavedPrompt {
  id: string;
  prompt: string;
  label: string;
  timestamp: string;
  collectionId?: string;
  order?: number;
}

export interface PromptCollection {
  id: string;
  name: string;
  prompts: string[];
}

export interface TypedRequest<T> extends Request {
  body: T;
}

export interface SuccessResponse {
  message: string;
}

export interface ErrorResponse {
  error: string;
} 
