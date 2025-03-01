export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface Message {
  role: 'user' | 'assistant';
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

export interface ThreadMapping {
  localThreadId: string;
  openAIThreadId: string | null;
  models: string[];
  isActive: boolean;
  lastUpdated: string;
}

export interface ThreadMessage extends Message {
  localThreadId: string;
  messageId: string;
  openAIMessageId?: string;
}

export interface ThreadState {
  mapping: ThreadMapping;
  messages: ThreadMessage[];
} 
