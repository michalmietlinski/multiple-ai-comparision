import { promises as fsPromises } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DIRECTORIES } from '../config/directories.js';
import { Thread, ThreadMessage } from '../types/threads.types.js';

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
      const filePath = path.join(DIRECTORIES.THREAD_LOGS, `${thread.id}.json`);
      await fsPromises.writeFile(
        filePath,
        JSON.stringify(thread, null, 2)
      );
    } catch (error) {
      console.error('Error saving thread:', error);
      throw new Error('Failed to save thread');
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
      return JSON.parse(data) as Thread;
    } catch (error) {
      console.error('Error getting thread:', error);
      throw new Error('Failed to get thread');
    }
  }

  async saveMessage(threadId: string, message: ThreadMessage): Promise<Thread> {
    try {
      const thread = await this.getThread(threadId);
      thread.messages.push(message);
      thread.updatedAt = new Date().toISOString();
      await this.saveThread(thread);
      return thread;
    } catch (error) {
      console.error('Error saving message:', error);
      throw new Error('Failed to save message');
    }
  }

  async updateThreadMapping(threadId: string, openAIThreadId: string): Promise<Thread> {
    try {
      const thread = await this.getThread(threadId);
      thread.openAIThreadId = openAIThreadId;
      thread.updatedAt = new Date().toISOString();
      await this.saveThread(thread);
      return thread;
    } catch (error) {
      console.error('Error updating thread mapping:', error);
      throw new Error('Failed to update thread mapping');
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
          threads.push(thread);
        } catch (error) {
          console.error(`Error reading thread file ${file}:`, error);
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
} 
