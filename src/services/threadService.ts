import axios from 'axios';
import { ThreadMessage, ThreadState, Message } from '../types/chat.types';

const API_BASE = 'http://localhost:3001/api';

export class ThreadService {
  static async createThread(models: string[]): Promise<any> { //Promise<ThreadState> {
    // try {
    //   console.log('[ThreadService] Creating thread with models:', models);
      
    //   // First create a thread via thread-chat to get initial threadId
    //   const chatResponse = await axios.post(`${API_BASE}/threads/thread-chat`, {
    //     models,
    //     prompt: '',
    //     threadId: null,
    //     previousMessages: []
    //   });

    //   // Create thread mapping
    //   const mapping = {
    //     localThreadId: chatResponse.data.threadId,
    //     models,
    //     isActive: true,
    //     lastUpdated: new Date().toISOString()
    //   };

    //   // Save thread state
    //   const threadResponse = await axios.post(`${API_BASE}/threads`, {
    //     mapping,
    //     messages: chatResponse.data.history || []
    //   });

    //   console.log('[ThreadService] Thread created:', threadResponse.data.id);
    //   return threadResponse.data;
    // } catch (error) {
    //   console.error('[ThreadService] Error creating thread:', error);
    //   throw new Error('Failed to create thread');
    // }
  }

  static async sendMessage(threadId: string, content: string): Promise<ThreadMessage[]> {
    try {
      console.log('[ThreadService] Sending message:', {
        threadId,
        contentLength: content.length
      });

      // Get current thread state
      const thread = await this.getThread(threadId);

      // Send message via chat endpoint
      const chatResponse = await axios.post(`${API_BASE}/threads/thread-chat`, {
        threadId,
        prompt: content,
        models: thread.models,
        previousMessages: thread.messages
      });

      // Update thread state with new messages
      await axios.post(`${API_BASE}/threads/${threadId}`, {
        messages: chatResponse.data.history,
        models: thread.models
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
      console.log('[ThreadService] Clearing all threads...');
      await axios.delete(`${API_BASE}/threads`);
      console.log('[ThreadService] All threads cleared successfully');
    } catch (error) {
      console.error('[ThreadService] Error clearing threads:', error);
      throw new Error('Failed to clear threads');
    }
  }
} 
