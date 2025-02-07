import { DEFAULT_PROVIDER_CONFIGS } from './providerConfig.js';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const getAllModels = async (config) => {
  const models = [];
  
  for (const api of config.apis) {
    if (!api.active) continue;

    const providerConfig = DEFAULT_PROVIDER_CONFIGS[api.provider];
    if (!providerConfig) continue;

    for (const modelId of providerConfig.models) {
      models.push({
        id: modelId,
        name: formatModelName(modelId),
        apiId: api.id,
        provider: api.provider
      });
    }
  }

  return models;
};

export const getModelResponse = async (api, modelId, prompt) => {
  switch (api.provider) {
    case 'openai':
      const openai = new OpenAI({
        apiKey: api.key,
        baseURL: api.url || DEFAULT_PROVIDER_CONFIGS.openai.url
      });
      const completion = await openai.chat.completions.create({
        model: modelId,
        messages: [{ role: 'user', content: prompt }]
      });
      return completion.choices[0].message.content;
      
    case 'gemini':
      const genAI = new GoogleGenerativeAI(api.key);
      const model = genAI.getGenerativeModel({ model: modelId });
      const result = await model.generateContent(prompt);
      return result.response.text();
      
    // Add other providers here
    default:
      throw new Error(`Unsupported provider: ${api.provider}`);
  }
};

export const formatModelName = (modelId) => {
  return modelId
    .replace('gpt-', 'GPT-')
    .split('-')
    .map(word => word === 'turbo' ? 'Turbo' : word)
    .join(' ');
}; 
