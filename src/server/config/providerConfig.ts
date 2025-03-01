interface ProviderConfig {
  url?: string;
  models: string[];
}

interface ProviderConfigs {
  [key: string]: ProviderConfig;
}

export const DEFAULT_PROVIDER_CONFIGS: ProviderConfigs = {
  openai: {
    url: 'https://api.openai.com/v1',
    models: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo-0125']
  },
  deepseek: {
    url: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-coder']
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1',
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku']
  },
  gemini: {
    models: ['gemini-pro', 'gemini-pro-vision']
  }
};

interface ApiConfig {
  name: string;
  provider: string;
  key: string;
  url?: string;
  isEnabled?: boolean;
}

export const validateProviderConfig = (config: ApiConfig): boolean => {
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid provider configuration');
  }

  const requiredFields = ['name', 'provider', 'key'] as const;
  const missingFields = requiredFields.filter(field => !(field in config));
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  if (!DEFAULT_PROVIDER_CONFIGS[config.provider] && config.provider !== 'custom') {
    throw new Error(`Unsupported provider: ${config.provider}`);
  }

  return true;
}; 
