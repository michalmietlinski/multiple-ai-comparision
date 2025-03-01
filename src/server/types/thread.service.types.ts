import { ThreadMessage } from './api.types';
import { ChatResponse } from './threads.types';

export interface ThreadHistoryResult {
  messages: ThreadMessage[];
  threadId: string;
}

export interface ThreadSummary {
  id: string;
  shortId: string;
  firstPrompt: string;
  timestamp: string;
  messages: ThreadMessage[];
  models: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ThreadChatSaveResult {
  threadId: string;
  history: ThreadMessage[];
}

export interface ThreadMigrationResult {
  success: boolean;
  error?: string;
}

export interface ThreadContentSearchResult {
  threadId: string | null;
  found: boolean;
} 
