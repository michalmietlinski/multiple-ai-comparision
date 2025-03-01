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
