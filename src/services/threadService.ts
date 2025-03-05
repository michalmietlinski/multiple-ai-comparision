import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { 
  ThreadMessage, 
  ThreadStateWithCombinedMessages 
} from '../shared/types/messages.types';

const API_BASE = 'http://localhost:3001/api';

export class ThreadService {
  static async createThread(models: string[]): Promise<ThreadStateWithCombinedMessages> {
    try {
      console.log('[ThreadService] Creating thread with models:', models);
      
      const threadId = uuidv4();
      const timestamp = new Date().toISOString();
      
      // Create initial thread state
      const newThread: ThreadStateWithCombinedMessages = {
        id: threadId,
        models,
        isActive: true,
        messages: [],
        createdAt: timestamp,
        updatedAt: timestamp
      };

      console.log('[ThreadService] Thread created:', threadId);
      return newThread;
    } catch (error) {
      console.error('[ThreadService] Error creating thread:', error);
      throw new Error('Failed to create thread');
    }
  }

  static async sendMessage(threadId: string, content: string, models: string[]): Promise<ThreadMessage[]> {
    try {

      // Send message - backend handles thread state and history
      const chatResponse = await axios.post(`${API_BASE}/threads/thread-chat`, {
        threadId,
        prompt: content,
        models
      });
      
      // Make sure we have a valid history array
      if (!chatResponse.data.history || !Array.isArray(chatResponse.data.history)) {
        console.error('[ThreadService] Invalid history in response:', chatResponse.data);
        return [];
      }
      
      return chatResponse.data.history;
    } catch (error) {
      console.error('[ThreadService] Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }

  static async getThread(threadId: string): Promise<ThreadStateWithCombinedMessages> {
    try {
      const response = await axios.get(`${API_BASE}/threads/${threadId}`);
      return response.data;
    } catch (error) {
      console.error('[ThreadService] Error fetching thread:', error);
      throw new Error('Failed to fetch thread');
    }
  }

  static async listThreads(): Promise<ThreadStateWithCombinedMessages[]> {
    try {
      const response = await axios.get(`${API_BASE}/threads`);
      const threads = response.data.threads || [];
      
      const validThreads = threads.filter((thread: any) => 
        thread && 
        thread.id &&
        thread.messages &&
        Array.isArray(thread.messages)
      );
      return validThreads;
    } catch (error) {
      console.error('[ThreadService] Error listing threads:', error);
      throw new Error('Failed to list threads');
    }
  }

  static async deleteThread(threadId: string): Promise<void> {
    try {
      console.log('[ThreadService] Deleting thread:', threadId);
      await axios.delete(`${API_BASE}/threads/${threadId}`);
      console.log('[ThreadService] Thread deleted successfully');
    } catch (error) {
      console.error('[ThreadService] Error deleting thread:', error);
      throw new Error('Failed to delete thread');
    }
  }

  static async clearAllThreads(): Promise<void> {
    try {
      await axios.delete(`${API_BASE}/threads`);
    } catch (error) {
      console.error('[ThreadService] Error clearing threads:', error);
      throw new Error('Failed to clear threads');
    }
  }

  // Helper method to get messages for a specific model
  static getMessagesForModel(thread: ThreadStateWithCombinedMessages, modelId: string): { role: string; content: string }[] {
    if (!thread || !thread.messages || !Array.isArray(thread.messages)) {
      return [];
    }
    
    const actualModelId = getActualModelId(modelId);
    
    // Convert the new message structure to the format expected by OpenAI
    return thread.messages.flatMap(msg => {
      const messages = [];
      
      // Add user message
      messages.push({
        role: msg.userMessage.role,
        content: msg.userMessage.content
      });
      
      // Add responses for the specified model
      const modelResponses = msg.responses
        .filter(response => !response.model || response.model === actualModelId)
        .map(response => ({
          role: response.role,
          content: response.content
        }));
      
      return [...messages, ...modelResponses];
    });
  }
}

function getActualModelId(modelName: string): string {
  return modelName.split(' ')[0].toLowerCase();
} 
