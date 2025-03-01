export interface ConversationResponse {
  model: string;
  response: string;
}

export interface ConversationData {
  timestamp: string;
  prompt: string;
  responses: ConversationResponse[];
}

export interface LogEntry extends ConversationData {
  date: string;
  fileName: string;
}

export interface SaveConversationResult {
  fileName: string;
  dateStr: string;
}

export interface SuccessResponse {
  message: string;
}

export interface ErrorResponse {
  error: string;
} 
