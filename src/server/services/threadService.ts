import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import pkg from 'uuid';
const { v4: uuidv4 } = pkg;
import { FILES, DIRECTORIES } from '../utils/directoryManager.js';
import { Thread, ThreadMessage } from '../types/api.types.js';
import { ChatResponse } from '../types/threads.types.js';
import { 
  ThreadHistoryResult, 
  ThreadSummary, 
  ThreadChatSaveResult,
  ThreadMigrationResult,
  ThreadContentSearchResult 
} from '../types/thread.service.types';
import { getActualModelId } from '../../config/modelConfig.js';

const ensureThreadId = (threadId: string | null | undefined): string => {
  if (!threadId || threadId === 'null') {
    const newId = uuidv4();
    console.log('Generated new UUID:', newId, 'for threadId:', threadId);
    return newId;
  }
  console.log('Using existing threadId:', threadId);
  return threadId;
};

const migrateThread = async (oldThreadId: string, newThreadId: string): Promise<ThreadMigrationResult> => {
  console.log('Attempting to migrate thread:', { from: oldThreadId, to: newThreadId });
  if (oldThreadId === newThreadId) {
    console.log('Skip migration - same IDs');
    return { success: true };
  }

  const oldPath = path.join(DIRECTORIES.THREAD_LOGS, `${oldThreadId}.json`);
  const newPath = path.join(DIRECTORIES.THREAD_LOGS, `${newThreadId}.json`);

  try {
    // If old thread exists, merge it with new thread or move it
    if (await fsPromises.access(oldPath).then(() => true).catch(() => false)) {
      console.log('Found old thread file:', oldPath);
      let oldHistory: ThreadMessage[] = [];
      let newHistory: ThreadMessage[] = [];

      // Read old thread
      const oldContent = await fsPromises.readFile(oldPath, 'utf-8');
      oldHistory = JSON.parse(oldContent);
      console.log('Old history:', oldHistory);

      // Try to read existing new thread
      try {
        const newContent = await fsPromises.readFile(newPath, 'utf-8');
        newHistory = JSON.parse(newContent);
        console.log('Existing new history:', newHistory);
      } catch {
        console.log('No existing new thread file');
      }

      // Merge histories, avoiding duplicates
      const mergedHistory = [...oldHistory];
      newHistory.forEach(msg => {
        if (!mergedHistory.some(existing => 
          existing.role === msg.role && 
          existing.content === msg.content &&
          existing.model === msg.model
        )) {
          mergedHistory.push(msg);
        }
      });

      console.log('Merged history:', mergedHistory);

      // Save merged history to new thread
      await fsPromises.writeFile(newPath, JSON.stringify(mergedHistory, null, 2));
      console.log('Saved merged history to:', newPath);

      // Delete old thread
      await fsPromises.unlink(oldPath);
      console.log('Deleted old thread file:', oldPath);
      return { success: true };
    } else {
      console.log('Old thread file not found:', oldPath);
      return { success: true };
    }
  } catch (error) {
    console.error('Error during thread migration:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error during migration' 
    };
  }
};

export const getThreadHistory = async (threadId: string): Promise<{ messages: ThreadMessage[]; threadId: string }> => {
  try {
    const filePath = path.join(DIRECTORIES.THREAD_LOGS, `${threadId}.json`);
    const fileExists = await fsPromises.access(filePath)
      .then(() => true)
      .catch(() => false);

    if (!fileExists) {
      // Initialize with empty thread structure
      const thread: Thread = {
        id: threadId,
        messages: [],
        models: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await fsPromises.writeFile(filePath, JSON.stringify(thread, null, 2));
      return { messages: thread.messages, threadId };
    }

    const data = await fsPromises.readFile(filePath, 'utf-8');
    const thread = JSON.parse(data) as Thread;
    return { messages: thread.messages || [], threadId };
  } catch (error) {
    console.error('Error reading thread history:', error);
    return { messages: [], threadId };
  }
};

export const getAllThreads = async (): Promise<Thread[]> => {
  try {
    const files = await fsPromises.readdir(DIRECTORIES.THREAD_LOGS);
    const threads: Thread[] = [];

    for (const file of files) {
      if (path.extname(file) === '.json') {
        const filePath = path.join(DIRECTORIES.THREAD_LOGS, file);
        const data = await fsPromises.readFile(filePath, 'utf-8');
        threads.push(JSON.parse(data));
      }
    }

    return threads.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (error) {
    console.error('Error reading threads:', error);
    return [];
  }
};

const findThreadByContent = async (prompt: string): Promise<ThreadContentSearchResult> => {
  console.log('Looking for existing thread with prompt:', prompt);
  const files = await fsPromises.readdir(DIRECTORIES.THREAD_LOGS);
  
  for (const file of files) {
    try {
      const filePath = path.join(DIRECTORIES.THREAD_LOGS, file);
      const content = await fsPromises.readFile(filePath, 'utf-8');
      const history = JSON.parse(content) as ThreadMessage[];
      
      // Look for the first user message matching our prompt
      const hasMatchingPrompt = history.some(msg => 
        msg.role === 'user' && msg.content === prompt
      );
      
      if (hasMatchingPrompt) {
        const threadId = path.parse(file).name;
        console.log('Found existing thread:', threadId);
        return { threadId, found: true };
      }
    } catch (error) {
      console.error('Error checking thread file:', file, error);
    }
  }
  
  console.log('No existing thread found for prompt');
  return { threadId: null, found: false };
};

export const saveThreadChat = async (
  threadId: string | null,
  prompt: string,
  responses: { model: string; response: string; usage?: any }[]
): Promise<{ threadId: string }> => {
  try {
    const actualThreadId = threadId || uuidv4();
    const filePath = path.join(DIRECTORIES.THREAD_LOGS, `${actualThreadId}.json`);
    const timestamp = new Date().toISOString();

    let thread: Thread = {
      id: actualThreadId,
      messages: [],
      models: responses.map(r => getActualModelId(r.model)),
      createdAt: timestamp,
      updatedAt: timestamp
    };

    try {
      const data = await fsPromises.readFile(filePath, 'utf-8');
      const existingThread = JSON.parse(data) as Thread;
      thread = {
        ...existingThread,
        messages: existingThread.messages || [],
        models: [...new Set([...existingThread.models, ...responses.map(r => getActualModelId(r.model))])],
        updatedAt: timestamp
      };
    } catch (error) {
      console.log('Creating new thread:', actualThreadId);
    }

    // Add user message
    thread.messages = thread.messages || [];
    thread.messages.push({
      role: 'user',
      content: prompt,
      timestamp
    });

    // Add model responses
    for (const { model, response, usage } of responses) {
      thread.messages.push({
        role: 'assistant',
        content: response,
        model: getActualModelId(model),
        timestamp,
        usage
      });
    }

    await fsPromises.writeFile(filePath, JSON.stringify(thread, null, 2));
    return { threadId: actualThreadId };
  } catch (error) {
    console.error('Error saving thread chat:', error);
    throw error;
  }
};

export const deleteThread = async (threadId: string): Promise<void> => {
  try {
    const filePath = path.join(DIRECTORIES.THREAD_LOGS, `${threadId}.json`);
    await fsPromises.unlink(filePath);
  } catch (error) {
    console.error('Error deleting thread:', error);
    throw error;
  }
};

export const deleteAllThreads = async (): Promise<void> => {
  try {
    const files = await fsPromises.readdir(DIRECTORIES.THREAD_LOGS);
    await Promise.all(
      files
        .filter(file => path.extname(file) === '.json')
        .map(file => fsPromises.unlink(path.join(DIRECTORIES.THREAD_LOGS, file)))
    );
  } catch (error) {
    console.error('Error deleting all threads:', error);
    throw error;
  }
};

export const getModelThreadHistory = (
  messages: ThreadMessage[] | undefined,
  modelId: string
): { role: 'user' | 'assistant' | 'system'; content: string }[] => {
  if (!messages) return [];
  
  const actualModelId = getActualModelId(modelId);
  
  return messages
    .filter(msg => !msg.model || msg.model === actualModelId)
    .map(msg => ({
      role: msg.role,
      content: msg.content
    }));
}; 
