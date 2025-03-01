import { SavedPrompt } from './api.types';

export interface SavedPromptWithFilename extends SavedPrompt {
  filename: string;
  order?: number;
}

export interface ReorderRequest {
  prompts: SavedPromptWithFilename[];
}

export interface ReorderResponse {
  message: string;
}

export interface SavePromptRequest extends Omit<SavedPrompt, 'id' | 'timestamp'> {
  label: string;
  prompt: string;
  collectionId?: string;
} 
