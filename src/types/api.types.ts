/**
 * @deprecated This file is deprecated. Use shared types from src/shared/types/api.types.ts instead.
 * 
 * This file will be removed in a future update. All types have been moved to the shared directory
 * to eliminate duplication and ensure consistency across the codebase.
 */

export interface Provider {
  url?: string;
  models: string[];
}

export type ProviderType = 'openai' | 'anthropic' | 'deepseek' | 'gemini' | 'custom';

export interface ApiConfig {
  id: string;
  name: string;
  key: string;
  provider: ProviderType;
  url?: string;
  active: boolean;
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  apiId: string;
  url?: string;
}

export interface ProviderConfig {
  title: string;
  steps: string[];
  link: string;
} 
