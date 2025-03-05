import { promises as fsPromises } from 'fs';
import path from 'path';
import { DIRECTORIES } from '../config/directories.js';
import { Thread } from '../types/threads.types.js';
import { ThreadMessage } from 'server/types/api.types.js';

export class StorageService {
  private static instance: StorageService;

  private constructor() {}

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  async saveThread(thread: Thread): Promise<void> {
    try {
      // Validate thread before saving
      if (!thread.id || !thread.messages || !Array.isArray(thread.messages) || 
          !thread.models || !Array.isArray(thread.models) ||
          !thread.createdAt || !thread.updatedAt) {
        console.error('Invalid thread data:', thread);
        throw new Error('Invalid thread data structure');
      }

      const filePath = path.join(DIRECTORIES.THREAD_LOGS, `${thread.id}.json`);
      await fsPromises.writeFile(
        filePath,
        JSON.stringify(thread, null, 2)
      );
    } catch (error) {
      console.error('Error saving thread:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to save thread');
    }
  }

  async getThread(threadId: string): Promise<Thread> {
    try {
      const filePath = path.join(DIRECTORIES.THREAD_LOGS, `${threadId}.json`);
      const fileExists = await fsPromises.access(filePath)
        .then(() => true)
        .catch(() => false);

      if (!fileExists) {
        // Initialize new thread
        const thread: Thread = {
          id: threadId,
          messages: [],
          models: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          openAIThreadId: null
        };
        await this.saveThread(thread);
        return thread;
      }

      const data = await fsPromises.readFile(filePath, 'utf-8');
      const thread = JSON.parse(data) as Thread;
      
      // Validate thread after reading
      if (!thread.id || !thread.messages || !Array.isArray(thread.messages) || 
          !thread.models || !Array.isArray(thread.models) ||
          !thread.createdAt || !thread.updatedAt) {
        console.error(`Invalid thread data in file ${threadId}.json:`, thread);
        throw new Error('Invalid thread data structure');
      }

      return thread;
    } catch (error) {
      console.error('Error getting thread:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to get thread');
    }
  }

  async saveMessage(threadId: string, message: ThreadMessage): Promise<Thread> {
    try {
      if (!message.userMessage.role || !message.userMessage.content || !message.timestamp) {
        console.error('Invalid message data:', message);
        throw new Error('Invalid message data structure');
      }

      const thread = await this.getThread(threadId);
      thread.messages.push(message);
      thread.updatedAt = new Date().toISOString();
      await this.saveThread(thread);
      return thread;
    } catch (error) {
      console.error('Error saving message:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to save message');
    }
  }

  async updateThreadMapping(threadId: string, openAIThreadId: string): Promise<Thread> {
    try {
      if (!threadId || typeof threadId !== 'string') {
        throw new Error('Invalid threadId');
      }

      const thread = await this.getThread(threadId);
      thread.openAIThreadId = openAIThreadId;
      thread.updatedAt = new Date().toISOString();
      await this.saveThread(thread);
      return thread;
    } catch (error) {
      console.error('Error updating thread mapping:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update thread mapping');
    }
  }

  async listThreads(): Promise<Thread[]> {
    try {
      const files = await fsPromises.readdir(DIRECTORIES.THREAD_LOGS);
      const threads: Thread[] = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        try {
          const filePath = path.join(DIRECTORIES.THREAD_LOGS, file);
          const data = await fsPromises.readFile(filePath, 'utf-8');
          const thread = JSON.parse(data) as Thread;
          
          // Validate required thread properties
          if (!thread.id || !thread.messages || !Array.isArray(thread.messages) || 
              !thread.models || !Array.isArray(thread.models) ||
              !thread.createdAt || !thread.updatedAt) {
            console.error(`Invalid thread data in file ${file}:`, thread);
            continue;
          }
          
          threads.push(thread);
        } catch (error) {
          console.error(`Error reading thread file ${file}:`, error);
          // Skip invalid files instead of breaking
          continue;
        }
      }

      return threads.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch (error) {
      console.error('Error listing threads:', error);
      throw new Error('Failed to list threads');
    }
  }

  async deleteThread(threadId: string): Promise<void> {
    try {
      const filePath = path.join(DIRECTORIES.THREAD_LOGS, `${threadId}.json`);
      await fsPromises.unlink(filePath);
    } catch (error) {
      console.error('Error deleting thread:', error);
      throw new Error('Failed to delete thread');
    }
  }

  async deleteAllThreads(): Promise<void> {
    try {
      const files = await fsPromises.readdir(DIRECTORIES.THREAD_LOGS);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        try {
          await fsPromises.unlink(path.join(DIRECTORIES.THREAD_LOGS, file));
        } catch (error) {
          console.error(`Error deleting thread file ${file}:`, error);
          // Continue with other files even if one fails
        }
      }
    } catch (error) {
      console.error('Error deleting all threads:', error);
      throw new Error('Failed to delete all threads');
    }
  }
} 
