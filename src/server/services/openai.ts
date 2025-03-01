import OpenAI from 'openai';
import { DEFAULT_PROVIDER_CONFIGS } from '../config/providerConfig.js';
import { getDefaultApiConfig } from './apiService.js';
import { ChatUsage } from '../types/threads.types.js';

export interface AssistantConfig {
  name: string;
  description: string;
  instructions: string;
  model: string;
}

export class OpenAIService {
  private openai: OpenAI;
  private static instance: OpenAIService;
  private assistantId: string | null = null;

  private constructor() {
    this.openai = null as any;
  }

  static async getInstance(): Promise<OpenAIService> {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
      await OpenAIService.instance.init();
    }
    return OpenAIService.instance;
  }

  private async init() {
    const config = await getDefaultApiConfig();
    const api = config.apis.find(a => 
      a.provider === 'openai' && 
      a.active
    );

    if (!api) {
      throw new Error('No active OpenAI API configuration found');
    }

    this.openai = new OpenAI({
      apiKey: api.key,
      baseURL: api.url || DEFAULT_PROVIDER_CONFIGS.openai.url
    });

    await this.ensureAssistant();
  }

  private async ensureAssistant() {
    try {
      // Try to get assistant ID from env
      this.assistantId = process.env.OPENAI_ASSISTANT_ID || null;

      // If no assistant ID, create new assistant
      if (!this.assistantId) {
        const assistant = await this.createAssistant({
          name: "AI Code Comparison Assistant",
          description: "An assistant that helps compare different AI models' responses",
          instructions: `You are an AI assistant helping users compare responses from different AI models.
            - Analyze and compare responses objectively
            - Point out strengths and weaknesses
            - Consider factors like accuracy, creativity, and relevance
            - Use code interpreter when analyzing code
            - Maintain conversation context`,
          model: "gpt-4-turbo-preview"
        });
        this.assistantId = assistant.id;
        console.log('Created new assistant:', this.assistantId);
      }

      if (!this.assistantId) {
        throw new Error('Failed to initialize assistant');
      }
    } catch (error) {
      console.error('Error ensuring assistant:', error);
      throw new Error('Failed to initialize OpenAI assistant');
    }
  }

  private async createAssistant(config: AssistantConfig) {
    try {
      const assistant = await this.openai.beta.assistants.create({
        name: config.name,
        description: config.description,
        instructions: config.instructions,
        model: config.model,
        tools: [{ type: 'code_interpreter' }]
      });
      return assistant;
    } catch (error) {
      console.error('Error creating assistant:', error);
      throw new Error('Failed to create OpenAI assistant');
    }
  }

  async createThread(): Promise<string> {
    try {
      const thread = await this.openai.beta.threads.create();
      return thread.id;
    } catch (error) {
      console.error('Error creating OpenAI thread:', error);
      throw new Error('Failed to create OpenAI thread');
    }
  }

  async sendMessage(content: string, threadId: string): Promise<{
    content: string;
    usage: ChatUsage | null;
  }> {
    try {
      if (!this.assistantId) {
        throw new Error('Assistant not initialized');
      }

      // Add the message to the thread
      await this.openai.beta.threads.messages.create(threadId, {
        role: 'user',
        content
      });

      // Run the assistant
      const run = await this.openai.beta.threads.runs.create(threadId, {
        assistant_id: this.assistantId,
      });

      // Wait for completion with timeout
      let runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout

      while ((runStatus.status === 'in_progress' || runStatus.status === 'queued') && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Request timed out');
      }

      if (runStatus.status !== 'completed') {
        throw new Error(`Run failed with status: ${runStatus.status}`);
      }

      // Get the assistant's response
      const messages = await this.openai.beta.threads.messages.list(threadId);
      const lastMessage = messages.data[0];

      if (!lastMessage.content[0] || lastMessage.content[0].type !== 'text') {
        throw new Error('Invalid response format from OpenAI');
      }

      return {
        content: lastMessage.content[0].text.value,
        usage: runStatus.usage ? {
          prompt_tokens: runStatus.usage.prompt_tokens,
          completion_tokens: runStatus.usage.completion_tokens,
          total_tokens: runStatus.usage.total_tokens
        } : null
      };
    } catch (error) {
      console.error('Error sending message to OpenAI:', error);
      throw new Error('Failed to send message to OpenAI');
    }
  }

  async getThreadMessages(threadId: string): Promise<Array<{
    role: 'user' | 'assistant';
    content: string;
    createdAt: number;
  }>> {
    try {
      const messages = await this.openai.beta.threads.messages.list(threadId);
      return messages.data.map(msg => ({
        role: msg.role,
        content: msg.content[0]?.type === 'text' ? msg.content[0].text.value : '',
        createdAt: new Date(msg.created_at * 1000).getTime()
      }));
    } catch (error) {
      console.error('Error getting thread messages:', error);
      throw new Error('Failed to get thread messages');
    }
  }

  async deleteThread(threadId: string): Promise<void> {
    try {
      await this.openai.beta.threads.del(threadId);
    } catch (error) {
      console.error('Error deleting thread:', error);
      throw new Error('Failed to delete thread');
    }
  }
} 
