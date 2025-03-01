import axios from 'axios';
import { ThreadMessage, ThreadState, Message } from '../types/chat.types';
import { v4 as uuidv4 } from 'uuid';

const API_BASE = 'http://localhost:3001/api';

export class ThreadService {
  static async createThread(models: string[]): Promise<ThreadState> {
    try {
      console.log('[ThreadService] Creating thread with models:', models);
      
      const threadId = uuidv4();
      const timestamp = new Date().toISOString();
      
      // Just create initial frontend state
      const thread: ThreadState = {
        id: threadId,
        models,
        isActive: true,
        messages: [],
        createdAt: timestamp,
        updatedAt: timestamp
      };

      console.log('[ThreadService] Thread state prepared:', threadId);
      return thread;
    } catch (error) {
      console.error('[ThreadService] Error creating thread:', error);
      throw new Error('Failed to create thread');
    }
  }

  static async sendMessage(threadId: string, content: string, models: string[]): Promise<ThreadMessage[]> {
    try {
      console.log('[ThreadService] Sending message:', {
        threadId,
        contentLength: content.length,
        models
      });

      // Send message - backend handles thread state and history
      const chatResponse = await axios.post(`${API_BASE}/threads/thread-chat`, {
        threadId,
        prompt: content,
        models
      });

      console.log('[ThreadService] Message sent and thread updated');
      return chatResponse.data.history;
    } catch (error) {
      console.error('[ThreadService] Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }

  static async getThread(threadId: string): Promise<ThreadState> {
    try {
      const response = await axios.get(`${API_BASE}/threads/${threadId}`);
      console.log('[ThreadService] Thread retrieved:', {
        threadId: response.data.id,
        messagesCount: response.data.messages.length
      });
      return response.data;
    } catch (error) {
      console.error('[ThreadService] Error fetching thread:', error);
      throw new Error('Failed to fetch thread');
    }
  }

  static async listThreads(): Promise<ThreadState[]> {
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
} 
