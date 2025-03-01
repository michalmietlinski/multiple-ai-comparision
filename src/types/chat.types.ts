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

export interface ThreadMessage extends Message {
  
}

export interface ThreadState {
  id: string;
  models: string[];
  isActive: boolean;
  updatedAt: string;
  createdAt: string;
  messages: ThreadMessage[];
}
