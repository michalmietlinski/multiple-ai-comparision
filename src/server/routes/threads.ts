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
  ThreadState
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

// Create new empty thread
router.post('/', async (
  _req: Request,
  res: Response<{ threadId: string } | ErrorResponse>
) => {
  try {
    const thread = await storage.getThread(crypto.randomUUID());
    await storage.saveThread(thread);
    res.json({ threadId: thread.id });
  } catch (error) {
    console.error('Error creating thread:', error);
    res.status(500).json({ error: 'Failed to create thread' });
  }
});

// Create/update thread chat
router.post('/thread-chat', async (
  req: TypedRequest<ThreadChatRequest>,
  res: Response<ThreadChatResponse | ThreadErrorResponse>
) => {
  const { threadId, prompt, models, previousMessages } = req.body;
  console.log(`[${new Date().toISOString()}] 7. ThreadsRoute: Received chat request`, { 
    threadId, 
    models, 
    promptLength: prompt.length,
    historyLength: previousMessages?.length || 0 
  });
  
  try {
    const openai = await OpenAIService.getInstance();
    let thread;

    // Create new thread if threadId is not provided
    if (!threadId) {
      const newThreadId = crypto.randomUUID();
      console.log(`[${new Date().toISOString()}] 8. ThreadsRoute: Creating new thread`, { newThreadId });
      thread = await storage.getThread(newThreadId);
      thread.models = models;
      await storage.saveThread(thread);
    } else {
      console.log(`[${new Date().toISOString()}] 8. ThreadsRoute: Using existing thread`, { threadId });
      thread = await storage.getThread(threadId);
    }

    // Convert thread messages to OpenAI format
    const messageHistory = thread.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    console.log(`[${new Date().toISOString()}] 9. ThreadsRoute: Sending message to OpenAI with history`, { 
      historyLength: messageHistory.length 
    });
    
    // Send message and get response
    const { content: response, usage } = await openai.sendMessage(prompt, models[0], messageHistory);
    console.log(`[${new Date().toISOString()}] 10. ThreadsRoute: Received OpenAI response`, { responseLength: response.length });

    // Save user message
    const timestamp = new Date().toISOString();
    await storage.saveMessage(thread.id, {
      role: 'user',
      content: prompt,
      timestamp
    });

    // Save assistant response
    thread = await storage.saveMessage(thread.id, {
      role: 'assistant',
      content: response,
      timestamp,
      usage
    });

    // Update thread models if needed
    if (thread.models.join(',') !== models.join(',')) {
      thread.models = models;
      thread.updatedAt = timestamp;
      await storage.saveThread(thread);
    }

    console.log(`[${new Date().toISOString()}] 11. ThreadsRoute: Saved thread updates`, { threadId: thread.id });

    const responseData = {
      threadId: thread.id,
      responses: [{
        model: models[0],
        response,
        usage
      }],
      history: thread.messages
    };
    console.log(`[${new Date().toISOString()}] 12. ThreadsRoute: Sending response`, { 
      threadId: responseData.threadId, 
      historyLength: responseData.history.length 
    });
    res.json(responseData);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR ThreadsRoute: Failed to process chat request`, error);
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
    await storage.deleteThread(req.params.threadId);
    res.json({ message: 'Thread deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to delete thread' });
  }
});

// Handle single message to thread
router.post('/:threadId/message', async (
  req: Request<ThreadParams, any, { content: string }>,
  res: Response<ThreadChatResponse | ThreadErrorResponse>
) => {
  const { threadId } = req.params;
  const { content } = req.body;
  
  try {
    const openai = await OpenAIService.getInstance();
    let thread = await storage.getThread(threadId);

    // Convert thread messages to OpenAI format
    const messageHistory = thread.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Send message and get response
    const { content: response, usage } = await openai.sendMessage(content, 'gpt-4', messageHistory);

    // Save user message
    const timestamp = new Date().toISOString();
    await storage.saveMessage(threadId, {
      role: 'user',
      content,
      timestamp
    });

    // Save assistant response
    thread = await storage.saveMessage(threadId, {
      role: 'assistant',
      content: response,
      timestamp,
      usage
    });

    res.json({
      threadId: thread.id,
      responses: [{
        model: 'gpt-4',
        response,
        usage
      }],
      history: thread.messages
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      responses: [{
        model: 'gpt-4',
        response: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    });
  }
});

// Update thread
router.post('/:threadId', async (
  req: Request<ThreadParams>,
  res: Response<ThreadState | ErrorResponse>
) => {
  try {
    const thread = await storage.getThread(req.params.threadId);
    thread.updatedAt = new Date().toISOString();
    await storage.saveThread(thread);
    
    const threadState: ThreadState = {
      mapping: {
        localThreadId: thread.id,
        models: thread.models,
        isActive: true,
        lastUpdated: thread.updatedAt
      },
      messages: thread.messages
    };
    res.json(threadState);
  } catch (error) {
    console.error('Error updating thread:', error);
    res.status(500).json({ error: 'Failed to update thread' });
  }
});

export default router; 
