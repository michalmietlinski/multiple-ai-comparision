import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { ThreadMapping, ThreadMessage, ThreadState, Message } from '../types/chat.types';

const API_BASE = 'http://localhost:3001/api';

interface OpenAIThreadResponse {
  threadId: string;
  messages: Message[];
}

export class ThreadService {
  static async createThread(models: string[]): Promise<ThreadState> {
    try {
      // Create OpenAI thread first
      const openAIResponse = await axios.post<OpenAIThreadResponse>(`${API_BASE}/openai/thread`);
      
      const mapping: ThreadMapping = {
        localThreadId: uuidv4(),
        openAIThreadId: openAIResponse.data.threadId,
        models,
        isActive: true,
        lastUpdated: new Date().toISOString()
      };

      // Create local thread with OpenAI mapping
      const response = await axios.post(`${API_BASE}/thread/create`, {
        mapping,
        messages: []
      });

      return response.data;
    } catch (error) {
      console.error('Error creating thread:', error);
      throw new Error('Failed to create thread with OpenAI');
    }
  }

  static async getThread(localThreadId: string): Promise<ThreadState> {
    try {
      const response = await axios.get(`${API_BASE}/threads/${localThreadId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching thread:', error);
      throw new Error('Failed to fetch thread');
    }
  }

  static async sendMessage(threadId: string, content: string): Promise<ThreadMessage[]> {
    try {
      // Get thread first to ensure we have OpenAI thread ID
      const thread = await this.getThread(threadId);
      
      // If this is the first message, just save it locally without sending to OpenAI
      if (!thread.mapping.openAIThreadId && thread.messages.length === 0) {
        const response = await axios.post(`${API_BASE}/thread/${threadId}/message`, {
          content,
          openAIThreadId: null
        });
        return response.data;
      }

      // For second message or later, ensure we have OpenAI thread ID
      if (!thread.mapping.openAIThreadId) {
        throw new Error('No OpenAI thread ID found');
      }

      // Send message to OpenAI thread
      const response = await axios.post(`${API_BASE}/thread/${threadId}/message`, {
        content,
        openAIThreadId: thread.mapping.openAIThreadId
      });

      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }

  static async deleteThread(threadId: string): Promise<void> {
    try {
      // Get thread first to ensure we have OpenAI thread ID
      const thread = await this.getThread(threadId);
      
      if (thread.mapping.openAIThreadId) {
        // Delete OpenAI thread first
        await axios.delete(`${API_BASE}/openai/thread/${thread.mapping.openAIThreadId}`);
      }

      // Delete local thread
      await axios.delete(`${API_BASE}/thread/${threadId}`);
    } catch (error) {
      console.error('Error deleting thread:', error);
      throw new Error('Failed to delete thread');
    }
  }

  static async listThreads(): Promise<ThreadState[]> {
    try {
      const response = await axios.get(`${API_BASE}/threads`);
      const threads = response.data.threads || [];
      
      // Filter out invalid thread data
      return threads.filter((thread: any) => 
        thread && 
        thread.mapping && 
        thread.mapping.localThreadId &&
        thread.messages &&
        Array.isArray(thread.messages)
      );
    } catch (error) {
      console.error('Error listing threads:', error);
      throw new Error('Failed to list threads');
    }
  }

  static async updateThread(threadId: string, updates: Partial<ThreadMapping>): Promise<ThreadState> {
    try {
      const response = await axios.patch(`${API_BASE}/thread/${threadId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating thread:', error);
      throw new Error('Failed to update thread');
    }
  }

  static async clearAllThreads(): Promise<void> {
    try {
      const threads = await this.listThreads();
      
      // Delete all OpenAI threads first
      await Promise.all(
        threads
          .filter(t => t.mapping.openAIThreadId)
          .map(t => axios.delete(`${API_BASE}/openai/thread/${t.mapping.openAIThreadId}`))
      );

      // Delete all local threads
      await axios.delete(`${API_BASE}/threads`);
    } catch (error) {
      console.error('Error clearing threads:', error);
      throw new Error('Failed to clear threads');
    }
  }
} 
