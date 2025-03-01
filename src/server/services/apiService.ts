import fs from 'fs';
import fsPromises from 'fs/promises';
import { FILES, DIRECTORIES } from '../utils/directoryManager.js';
import { DEFAULT_PROVIDER_CONFIGS, validateProviderConfig } from '../config/providerConfig.js';
import { MODEL_MAPPINGS, getActualModelId } from '../../config/modelConfig.js';
import OpenAI from 'openai';
import { ApiModel, ApiProvider } from '../types/api.types.js';

interface ApiConfig {
  apis: ApiProvider[];
}

interface ApiConfigUpdate {
  name?: string;
  key?: string;
  provider?: string;
  url?: string;
  active?: boolean;
}

export const getDefaultApiConfig = async (): Promise<ApiConfig> => {
  const config = JSON.parse(await fsPromises.readFile(FILES.API_CONFIG, 'utf-8')) as ApiConfig;
  
  if (process.env.OPENAI_API_KEY) {
    const envApiExists = config.apis.some(api => 
      api.key === process.env.OPENAI_API_KEY && api.provider === 'openai'
    );
    
    if (!envApiExists) {
      const envApi: ApiProvider = {
        id: Date.now().toString(),
        name: 'OpenAI (ENV)',
        key: process.env.OPENAI_API_KEY,
        provider: 'openai',
        url: DEFAULT_PROVIDER_CONFIGS.openai.url,
        active: true
      };
      
      try {
        validateProviderConfig(envApi);
        config.apis.push(envApi);
        await fsPromises.writeFile(FILES.API_CONFIG, JSON.stringify(config, null, 2));
      } catch (error) {
        console.error('Invalid OpenAI ENV configuration:', error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }
  
  return config;
};

export const getAllModels = async (config: ApiConfig): Promise<ApiModel[]> => {
  const activeApis = config.apis.filter(api => api.active);
  const allModels: ApiModel[] = [];
  
  for (const api of activeApis) {
    try {
      let models: ApiModel[] = [];
      
      switch (api.provider) {
        case 'openai': {
          const openai = new OpenAI({ 
            apiKey: api.key,
            baseURL: api.url || DEFAULT_PROVIDER_CONFIGS.openai.url
          });
          const openaiModels = await openai.models.list();
          models = openaiModels.data
            .filter(model => model.id.includes('gpt'))
            .map(model => {
              const modelConfig = MODEL_MAPPINGS[model.id];
              return {
                id: model.id,
                name: modelConfig?.displayName || model.id,
                provider: 'openai',
                active: true,
                contextWindow: modelConfig?.contextWindow
              };
            });
          break;
        }
          
        case 'anthropic':
        case 'google':
        case 'mistral':
          models = Object.values(MODEL_MAPPINGS)
            .filter(model => model.provider === api.provider)
            .map(model => ({
              id: model.id,
              name: model.displayName,
              provider: api.provider,
              active: true,
              contextWindow: model.contextWindow
            }));
          break;
          
        default:
          if ('models' in api) {
            models = (api.models as string[]).map(modelId => {
              const modelConfig = MODEL_MAPPINGS[modelId];
              return {
                id: modelId,
                name: modelConfig?.displayName || modelId,
                provider: api.provider,
                active: true,
                contextWindow: modelConfig?.contextWindow
              };
            });
          }
      }
      
      allModels.push(...models);
    } catch (error) {
      console.error(`Error fetching models for ${api.name}:`, error);
    }
  }
  
  return allModels;
};

export const addApiConfig = async (apiConfig: Omit<ApiProvider, 'id'>): Promise<ApiProvider> => {
  const config = await getDefaultApiConfig();
  const newApi: ApiProvider = {
    id: Date.now().toString(),
    ...apiConfig,
    url: apiConfig.url || DEFAULT_PROVIDER_CONFIGS[apiConfig.provider]?.url
  };
  
  validateProviderConfig(newApi);
  config.apis.push(newApi);
  await fsPromises.writeFile(FILES.API_CONFIG, JSON.stringify(config, null, 2));
  
  return newApi;
};

export const deleteApiConfig = async (id: string): Promise<void> => {
  const config = await getDefaultApiConfig();
  config.apis = config.apis.filter(api => api.id !== id);
  await fsPromises.writeFile(FILES.API_CONFIG, JSON.stringify(config, null, 2));
};

export const updateApiConfig = async (id: string, updates: ApiConfigUpdate): Promise<ApiProvider> => {
  const config = await getDefaultApiConfig();
  const index = config.apis.findIndex(api => api.id === id);
  
  if (index === -1) {
    throw new Error('API configuration not found');
  }
  
  const updatedApi = { ...config.apis[index], ...updates };
  validateProviderConfig(updatedApi);
  
  config.apis[index] = updatedApi;
  await fsPromises.writeFile(FILES.API_CONFIG, JSON.stringify(config, null, 2));
  
  return updatedApi;
}; 
