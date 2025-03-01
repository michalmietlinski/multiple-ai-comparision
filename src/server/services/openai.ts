import OpenAI from 'openai';
import { DEFAULT_PROVIDER_CONFIGS } from '../config/providerConfig.js';
import { getDefaultApiConfig } from './apiService.js';
import { ChatUsage } from '../types/threads.types.js';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions.js';

export class OpenAIService {
  private openai: OpenAI;
  private static instance: OpenAIService | null = null;

  private constructor() {
    console.log(`[${new Date().toISOString()}] 1. OpenAIService: Constructor called`);
    this.openai = null as any;
  }

  static async getInstance(): Promise<OpenAIService> {
    try {
      console.log(`[${new Date().toISOString()}] 2. OpenAIService: Getting instance`);
      if (!OpenAIService.instance) {
        OpenAIService.instance = new OpenAIService();
        try {
          await OpenAIService.instance.init();
        } catch (initError) {
          OpenAIService.instance = null;
          console.error(`[${new Date().toISOString()}] ERROR OpenAIService: Failed to initialize`, initError);
          throw new Error(`OpenAI service initialization failed: ${initError instanceof Error ? initError.message : 'Unknown error'}`);
        }
      }
      if (!OpenAIService.instance) {
        throw new Error('Failed to create OpenAI service instance');
      }
      return OpenAIService.instance;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ERROR OpenAIService: getInstance failed`, error);
      throw error;
    }
  }

  private async init() {
    try {
      console.log(`[${new Date().toISOString()}] 3. OpenAIService: Initializing`);
      const config = await getDefaultApiConfig();
      
      if (!config || !config.apis) {
        throw new Error('Invalid API configuration');
      }

      const api = config.apis.find(a => 
        a.provider === 'openai' && 
        a.active
      );

      if (!api) {
        throw new Error('No active OpenAI API configuration found');
      }

      if (!api.key) {
        throw new Error('OpenAI API key is missing');
      }

      this.openai = new OpenAI({
        apiKey: api.key,
        baseURL: api.url || DEFAULT_PROVIDER_CONFIGS.openai.url
      });
      console.log(`[${new Date().toISOString()}] 4. OpenAIService: Initialized successfully`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ERROR OpenAIService: Initialization failed`, error);
      throw error;
    }
  }

  async sendMessage(content: string, model: string = 'gpt-4', previousMessages: ChatCompletionMessageParam[] = []): Promise<{
    content: string;
    usage: ChatUsage | null;
  }> {
    try {
      console.log(`[${new Date().toISOString()}] 5. OpenAIService: Sending message to OpenAI`, { 
        model, 
        contentLength: content.length,
        historyLength: previousMessages.length 
      });

      const messages: ChatCompletionMessageParam[] = [
        ...previousMessages,
        { role: 'user', content }
      ];

      const completion = await this.openai.chat.completions.create({
        model,
        messages,
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error('Empty response from OpenAI');
      }

      console.log(`[${new Date().toISOString()}] 6. OpenAIService: Received response from OpenAI`, { 
        responseLength: response.length,
        usage: completion.usage 
      });

      return {
        content: response,
        usage: completion.usage ? {
          prompt_tokens: completion.usage.prompt_tokens,
          completion_tokens: completion.usage.completion_tokens,
          total_tokens: completion.usage.total_tokens
        } : null
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ERROR OpenAIService: Failed to send message`, error);
      throw new Error('Failed to send message to OpenAI');
    }
  }
} 
