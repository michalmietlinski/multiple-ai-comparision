import { PromptCollection } from './api.types';

export interface CollectionWithId extends PromptCollection {
  id: string;
  createdAt: string;
}

export interface CreateCollectionRequest {
  name: string;
}

export interface AddPromptRequest {
  promptId: string;
}

export interface CollectionParams {
  collectionId: string;
}

export interface PromptParams extends CollectionParams {
  promptId: string;
}

export interface AddPromptResponse {
  message: string;
}

export interface RemovePromptResponse {
  message: string;
} 
