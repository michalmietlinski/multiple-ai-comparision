import express, { Request, Response } from 'express';
import { StorageService } from '../services/storage.js';
import { OpenAIService } from '../services/openai.js';
import { ErrorResponse } from '../types/api.types.js';
import { 
  ThreadHistoryResponse,
  ThreadsListResponse,
  ThreadChatRequest,
  ThreadChatResponse,
  ThreadErrorResponse,
  ThreadParams,
  ThreadSuccessResponse,
  ChatResponse,
  ThreadState,
  Message,
  ChatUsage
} from '../types/threads.types.js';
import { TypedRequest } from '../types/api.types.js';

const router = express.Router();
const storage = StorageService.getInstance();

// Get thread history
router.get('/thread-history/:threadId', async (
  req: Request<ThreadParams>,
  res: Response<ThreadHistoryResponse | ErrorResponse>
) => {
  try {
    const thread = await storage.getThread(req.params.threadId);
    res.json({ messages: thread.messages, threadId: thread.id });
  } catch (error) {
    console.error('Error loading thread history:', error);
    res.status(500).json({ error: 'Failed to load thread history' });
  }
});

// Get thread by ID
router.get('/:threadId', async (
  req: Request<ThreadParams>,
  res: Response<ThreadState | ErrorResponse>
) => {
  try {
    const thread = await storage.getThread(req.params.threadId);
    const threadState: ThreadState = {
      mapping: {
        localThreadId: thread.id,
        openAIThreadId: thread.openAIThreadId || null,
        models: thread.models,
        isActive: true,
        lastUpdated: thread.updatedAt
      },
      messages: thread.messages
    };
    res.json(threadState);
  } catch (error) {
    console.error('Error getting thread:', error);
    res.status(404).json({ error: 'Thread not found' });
  }
});

// Create/update thread chat
router.post('/thread-chat', async (
  req: TypedRequest<ThreadChatRequest>,
  res: Response<ThreadChatResponse | ThreadErrorResponse>
) => {
  const { threadId, prompt, models } = req.body;
  
  try {
    const openai = await OpenAIService.getInstance();
    let thread;
    let openAIThreadId;

    if (threadId) {
      // Get existing thread
      thread = await storage.getThread(threadId);
      openAIThreadId = thread.openAIThreadId;
    } else {
      // Create new thread
      thread = await storage.getThread(crypto.randomUUID());
    }

    // Create OpenAI thread if needed
    if (!openAIThreadId) {
      openAIThreadId = await openai.createThread();
      thread = await storage.updateThreadMapping(thread.id, openAIThreadId);
    }

    // Send message and get response
    const { content: response, usage } = await openai.sendMessage(prompt, openAIThreadId);

    // Save message and response
    const timestamp = new Date().toISOString();
    
    // Add user message
    thread.messages.push({
      role: 'user',
      content: prompt,
      timestamp
    });

    // Add assistant response
    thread.messages.push({
      role: 'assistant',
      content: response,
      timestamp,
      usage
    });

    // Update thread
    thread.updatedAt = timestamp;
    await storage.saveThread(thread);

    res.json({
      threadId: thread.id,
      responses: [{
        model: models[0], // For now, we only use one model
        response,
        usage
      }],
      history: thread.messages
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      responses: models.map(modelId => ({
        model: modelId,
        response: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }))
    });
  }
});

// Get all threads
router.get('/', async (_req: Request, res: Response<ThreadsListResponse | ErrorResponse>) => {
  try {
    const threads = await storage.listThreads();
    res.json({ threads });
  } catch (error) {
    console.error('Error listing threads:', error);
    res.status(500).json({ error: 'Failed to list threads' });
  }
});

// Delete a thread
router.delete('/:threadId', async (
  req: Request<ThreadParams>,
  res: Response<ThreadSuccessResponse | ErrorResponse>
) => {
  try {
    const thread = await storage.getThread(req.params.threadId);
    if (thread.openAIThreadId) {
      const openai = await OpenAIService.getInstance();
      await openai.deleteThread(thread.openAIThreadId);
    }
    await storage.deleteThread(req.params.threadId);
    res.json({ message: 'Thread deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to delete thread' });
  }
});

export default router; 
