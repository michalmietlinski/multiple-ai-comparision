import fs from 'fs';
import fsPromises from 'fs/promises';
import { FILES, DIRECTORIES } from '../utils/directoryManager.js';
import { DEFAULT_PROVIDER_CONFIGS, validateProviderConfig } from '../config/providerConfig.js';
import OpenAI from 'openai';

export const getDefaultApiConfig = async () => {
  const config = JSON.parse(await fsPromises.readFile(FILES.API_CONFIG, 'utf-8'));
  
  if (process.env.OPENAI_API_KEY) {
    const envApiExists = config.apis.some(api => 
      api.key === process.env.OPENAI_API_KEY && api.provider === 'openai'
    );
    
    if (!envApiExists) {
      const envApi = {
        id: Date.now(),
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
        console.error('Invalid OpenAI ENV configuration:', error.message);
      }
    }
  }
  
  return config;
};

export const getAllModels = async (config) => {
  const activeApis = config.apis.filter(api => api.active);
  const allModels = [];
  
  for (const api of activeApis) {
    try {
      let models = [];
      
      switch (api.provider) {
        case 'openai':
          const openai = new OpenAI({ 
            apiKey: api.key,
            baseURL: api.url || DEFAULT_PROVIDER_CONFIGS.openai.url
          });
          const openaiModels = await openai.models.list();
          models = openaiModels.data
            .filter(model => model.id.includes('gpt'))
            .map(model => ({
              id: model.id,
              name: model.id,
              provider: 'openai',
              apiId: api.id,
              url: api.url
            }));
          break;
          
        case 'deepseek':
        case 'anthropic':
          models = DEFAULT_PROVIDER_CONFIGS[api.provider].models.map(modelId => ({
            id: modelId,
            name: modelId,
            provider: api.provider,
            apiId: api.id,
            url: api.url
          }));
          break;
          
        default:
          if (api.models) {
            models = api.models.map(modelId => ({
              id: modelId,
              name: modelId,
              provider: api.provider,
              apiId: api.id,
              url: api.url
            }));
          }
      }
      
      allModels.push(...models);
    } catch (error) {
      console.error(`Error fetching models for ${api.name}:`, error);
    }
  }
  
  return allModels;
};

export const addApiConfig = async (apiConfig) => {
  const config = await getDefaultApiConfig();
  const newApi = {
    id: Date.now(),
    ...apiConfig,
    url: apiConfig.url || DEFAULT_PROVIDER_CONFIGS[apiConfig.provider]?.url
  };
  
  validateProviderConfig(newApi);
  config.apis.push(newApi);
  await fsPromises.writeFile(FILES.API_CONFIG, JSON.stringify(config, null, 2));
  
  return newApi;
};

export const deleteApiConfig = async (id) => {
  const config = await getDefaultApiConfig();
  config.apis = config.apis.filter(api => api.id !== parseInt(id));
  await fsPromises.writeFile(FILES.API_CONFIG, JSON.stringify(config, null, 2));
};

export const updateApiConfig = async (id, updates) => {
  const config = await getDefaultApiConfig();
  const index = config.apis.findIndex(api => api.id === parseInt(id));
  
  if (index === -1) {
    throw new Error('API configuration not found');
  }
  
  const updatedApi = { ...config.apis[index], ...updates };
  validateProviderConfig(updatedApi);
  
  config.apis[index] = updatedApi;
  await fsPromises.writeFile(FILES.API_CONFIG, JSON.stringify(config, null, 2));
  
  return updatedApi;
}; 
