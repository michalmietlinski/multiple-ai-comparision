import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { DIRECTORIES } from '../utils/directoryManager.js';
import OpenAI from 'openai';
import { DEFAULT_PROVIDER_CONFIGS } from '../config/providerConfig.js';
import pkg from 'uuid';
const { v4: uuidv4 } = pkg;

const ensureThreadId = (threadId) => {
  if (!threadId || threadId === 'null') {
    const newId = uuidv4();
    console.log('Generated new UUID:', newId, 'for threadId:', threadId);
    return newId;
  }
  console.log('Using existing threadId:', threadId);
  return threadId;
};

const migrateThread = async (oldThreadId, newThreadId) => {
  console.log('Attempting to migrate thread:', { from: oldThreadId, to: newThreadId });
  if (oldThreadId === newThreadId) {
    console.log('Skip migration - same IDs');
    return;
  }

  const oldPath = path.join(DIRECTORIES.THREAD_LOGS, `${oldThreadId}.json`);
  const newPath = path.join(DIRECTORIES.THREAD_LOGS, `${newThreadId}.json`);

  try {
    // If old thread exists, merge it with new thread or move it
    if (await fsPromises.access(oldPath).then(() => true).catch(() => false)) {
      console.log('Found old thread file:', oldPath);
      let oldHistory = [];
      let newHistory = [];

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
    } else {
      console.log('Old thread file not found:', oldPath);
    }
  } catch (error) {
    console.error('Error during thread migration:', error);
  }
};

export const getThreadHistory = async (threadId, providedThreadId = null) => {
  console.log('Getting thread history:', { threadId, providedThreadId });
  threadId = ensureThreadId(threadId);
  const filePath = path.join(DIRECTORIES.THREAD_LOGS, `${threadId}.json`);
  
  console.log('Checking file:', filePath);
  const fileExists = await fsPromises.access(filePath)
    .then(() => true)
    .catch(() => false);

  if (!fileExists) {
    console.log('No existing thread file');
    return { messages: [], threadId };
  }

  const fileContent = await fsPromises.readFile(filePath, 'utf-8');
  console.log('File content:', fileContent);
  
  try {
    // Try new format first (JSON array)
    const history = JSON.parse(fileContent);
    console.log('Parsed history:', history);
    
    // If we have both a UUID-based thread and a provided thread ID, migrate
    if (providedThreadId && threadId !== providedThreadId) {
      console.log('Need to migrate:', { from: threadId, to: providedThreadId });
      await migrateThread(threadId, providedThreadId);
      threadId = providedThreadId;
    }

    return {
      messages: history,
      threadId
    };
  } catch (error) {
    console.error('Error parsing thread history:', error);
    return { messages: [], threadId };
  }
};

export const getAllThreads = async () => {
  const files = await fsPromises.readdir(DIRECTORIES.THREAD_LOGS);
  const threads = [];
  
  for (const file of files) {
    try {
      const filePath = path.join(DIRECTORIES.THREAD_LOGS, file);
      const content = await fsPromises.readFile(filePath, 'utf-8');
      const threadId = path.parse(file).name;
      
      try {
        // Try new format first (JSON array)
        const history = JSON.parse(content);
        const firstUserMessage = history.find(msg => msg.role === 'user');
        
        threads.push({
          id: threadId,
          shortId: threadId.slice(-8),
          firstPrompt: firstUserMessage?.content || 'No prompt found',
          timestamp: new Date().toISOString() // Fallback timestamp
        });
      } catch {
        try {
          // Try old format (newline-delimited JSON)
          const lines = content.trim().split('\n');
          if (lines.length > 0) {
            const firstEntry = JSON.parse(lines[0]);
            
            threads.push({
              id: threadId,
              shortId: threadId.slice(-8),
              firstPrompt: firstEntry.prompt,
              timestamp: firstEntry.timestamp
            });
          }
        } catch (parseError) {
          console.error(`Error parsing thread ${threadId}:`, parseError);
          threads.push({
            id: threadId,
            shortId: threadId.slice(-8),
            firstPrompt: 'Unable to read thread',
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (fileError) {
      console.error(`Error reading thread file ${file}:`, fileError);
    }
  }
  
  return threads.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

const findThreadByContent = async (prompt) => {
  console.log('Looking for existing thread with prompt:', prompt);
  const files = await fsPromises.readdir(DIRECTORIES.THREAD_LOGS);
  
  for (const file of files) {
    try {
      const filePath = path.join(DIRECTORIES.THREAD_LOGS, file);
      const content = await fsPromises.readFile(filePath, 'utf-8');
      const history = JSON.parse(content);
      
      // Look for the first user message matching our prompt
      const hasMatchingPrompt = history.some(msg => 
        msg.role === 'user' && msg.content === prompt
      );
      
      if (hasMatchingPrompt) {
        const threadId = path.parse(file).name;
        console.log('Found existing thread:', threadId);
        return threadId;
      }
    } catch (error) {
      console.error('Error checking thread file:', file, error);
    }
  }
  
  console.log('No existing thread found for prompt');
  return null;
};

export const saveThreadChat = async (threadId, prompt, models, responses, previousMessages = []) => {
  console.log('Saving thread chat:', {
    threadId,
    prompt,
    models,
    responsesCount: responses.length,
    previousMessagesCount: previousMessages?.length
  });

  // Try to find existing thread by content if no threadId provided
  if (!threadId) {
    const existingThreadId = await findThreadByContent(prompt);
    if (existingThreadId) {
      console.log('Using found thread ID:', existingThreadId);
      threadId = existingThreadId;
    }
  }

  const generatedThreadId = ensureThreadId(threadId);
  console.log('Using thread ID:', generatedThreadId);
  
  const threadPath = path.join(DIRECTORIES.THREAD_LOGS, `${generatedThreadId}.json`);
  let threadHistory;

  try {
    // First try to load existing thread
    const threadData = await fsPromises.readFile(threadPath, 'utf8');
    threadHistory = JSON.parse(threadData);
    console.log('Loaded existing thread history:', threadHistory);
    
    // Ensure all existing assistant messages have model information
    threadHistory = threadHistory.map(msg => {
      if (msg.role === 'assistant' && !msg.model) {
        console.log('Adding missing model info to message:', msg);
        return { ...msg, model: models[0] }; // Use first model as fallback
      }
      return msg;
    });
  } catch (error) {
    console.log('No existing thread found or error loading:', error.message);
    // If no existing thread, check if we have previous messages
    if (previousMessages && previousMessages.length > 0) {
      console.log('Using provided previous messages:', previousMessages);
      threadHistory = previousMessages;
    } else {
      // Check if there's a UUID-based thread we should migrate from
      console.log('Checking for UUID-based thread');
      const uuidThread = await getThreadHistory(null);
      threadHistory = uuidThread.messages;
      console.log('Found UUID thread history:', threadHistory);
      
      if (threadId && threadId !== generatedThreadId) {
        console.log('Need to migrate UUID thread');
        await migrateThread(generatedThreadId, threadId);
      }
    }
  }

  // Ensure we have an array
  threadHistory = threadHistory || [];
  console.log('Current thread history:', threadHistory);

  // Add new messages
  if (!threadHistory.some(msg => msg.content === prompt && msg.role === 'user')) {
    console.log('Adding new user message:', prompt);
    threadHistory.push({ role: 'user', content: prompt });
  }

  responses.forEach(({ model, response }) => {
    if (!response.startsWith('Error:')) {
      console.log('Adding new response from model:', model);
      threadHistory.push({ 
        role: 'assistant', 
        model,
        content: response 
      });
    }
  });

  // Use the provided thread ID if available, otherwise use the generated one
  const finalThreadId = threadId || generatedThreadId;
  const finalThreadPath = path.join(DIRECTORIES.THREAD_LOGS, `${finalThreadId}.json`);
  
  console.log('Saving final thread:', {
    path: finalThreadPath,
    historyLength: threadHistory.length
  });
  
  await fsPromises.writeFile(finalThreadPath, JSON.stringify(threadHistory, null, 2));
  return { threadId: finalThreadId, history: threadHistory };
};

export const deleteThread = async (threadId) => {
  const filePath = path.join(DIRECTORIES.THREAD_LOGS, `${threadId}.json`);
  await fsPromises.unlink(filePath);
};

export const deleteAllThreads = async () => {
  const files = await fsPromises.readdir(DIRECTORIES.THREAD_LOGS);
  await Promise.all(
    files.map(file => 
      fsPromises.unlink(path.join(DIRECTORIES.THREAD_LOGS, file))
    )
  );
};

export const getModelThreadHistory = (threadHistory, modelId) => {
  return threadHistory
    .filter(entry => 
      entry.role === 'user' || // Include all user messages
      (entry.role === 'assistant' && (!entry.model || entry.model === modelId)) // Include responses from this model or untagged responses
    )
    .map(entry => {
      // Keep model information for assistant messages
      if (entry.role === 'assistant') {
        return {
          role: entry.role,
          content: entry.content,
          model: entry.model || modelId // Ensure model is always present
        };
      }
      return entry; // Keep user messages as is
    })
    .filter(entry => entry.role && entry.content); // Ensure valid entries only
}; 
