export interface ModelConfig {
  id: string;
  displayName: string;
  actualId: string;
  provider: string;
  contextWindow?: number;
}

export const MODEL_MAPPINGS: Record<string, ModelConfig> = {
  // OpenAI Models
  'gpt-4-turbo': {
    id: 'gpt-4-turbo',
    displayName: 'GPT-4 Turbo',
    actualId: 'gpt-4-turbo-preview',
    provider: 'openai',
    contextWindow: 128000
  },
  'gpt-4': {
    id: 'gpt-4',
    displayName: 'GPT-4',
    actualId: 'gpt-4',
    provider: 'openai',
    contextWindow: 8192
  },
  'gpt-3.5-turbo': {
    id: 'gpt-3.5-turbo',
    displayName: 'GPT-3.5 Turbo',
    actualId: 'gpt-3.5-turbo',
    provider: 'openai',
    contextWindow: 16385
  },
  // Anthropic Models
  'claude-3-opus': {
    id: 'claude-3-opus',
    displayName: 'Claude 3 Opus',
    actualId: 'claude-3-opus-20240229',
    provider: 'anthropic',
    contextWindow: 200000
  },
  'claude-3-sonnet': {
    id: 'claude-3-sonnet',
    displayName: 'Claude 3 Sonnet',
    actualId: 'claude-3-sonnet-20240229',
    provider: 'anthropic',
    contextWindow: 200000
  },
  'claude-2.1': {
    id: 'claude-2.1',
    displayName: 'Claude 2.1',
    actualId: 'claude-2.1',
    provider: 'anthropic',
    contextWindow: 200000
  },
  // Gemini Models
  'gemini-pro': {
    id: 'gemini-pro',
    displayName: 'Gemini Pro',
    actualId: 'gemini-pro',
    provider: 'google',
    contextWindow: 32768
  },
  'gemini-ultra': {
    id: 'gemini-ultra',
    displayName: 'Gemini Ultra',
    actualId: 'gemini-ultra',
    provider: 'google',
    contextWindow: 32768
  },
  // Mistral Models
  'mistral-large': {
    id: 'mistral-large',
    displayName: 'Mistral Large',
    actualId: 'mistral-large-latest',
    provider: 'mistral',
    contextWindow: 32768
  },
  'mistral-medium': {
    id: 'mistral-medium',
    displayName: 'Mistral Medium',
    actualId: 'mistral-medium-latest',
    provider: 'mistral',
    contextWindow: 32768
  },
  'mistral-small': {
    id: 'mistral-small',
    displayName: 'Mistral Small',
    actualId: 'mistral-small-latest',
    provider: 'mistral',
    contextWindow: 32768
  }
};

export const getModelConfig = (modelId: string): ModelConfig | undefined => {
  return MODEL_MAPPINGS[modelId];
};

export const getActualModelId = (modelId: string): string => {
  return MODEL_MAPPINGS[modelId]?.actualId || modelId;
};

export const getModelDisplayName = (modelId: string): string => {
  return MODEL_MAPPINGS[modelId]?.displayName || modelId;
}; 
