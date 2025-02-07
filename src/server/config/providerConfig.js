export const DEFAULT_PROVIDER_CONFIGS = {
  openai: {
    url: 'https://api.openai.com/v1',
    models: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo-preview']
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

export const validateProviderConfig = (config) => {
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid provider configuration');
  }

  const requiredFields = ['name', 'provider', 'key'];
  const missingFields = requiredFields.filter(field => !config[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  if (!DEFAULT_PROVIDER_CONFIGS[config.provider] && config.provider !== 'custom') {
    throw new Error(`Unsupported provider: ${config.provider}`);
  }

  return true;
}; 
