export interface SavedPrompt {
  id: string;
  label: string;
  description?: string;
  prompt: string;
  timestamp: string;
  collectionId?: string;
}

export interface SavedPromptWithFilename extends SavedPrompt {
  filename: string;
}

export interface PromptCollection {
  id: string;
  name: string;
  description?: string;
  prompts: SavedPrompt[];
}

export interface ExportData {
  model?: string;
  response?: string;
  prompt?: string;
  responses?: Record<string, string>;
  timestamp: string;
  fileName?: string;
  savedFileName?: string;
} 
