import express from 'express';
import OpenAI from 'openai';
import { DEFAULT_PROVIDER_CONFIGS } from '../config/providerConfig.js';
import { getDefaultApiConfig, getAllModels } from '../services/apiService.js';
import { getThreadHistory, getAllThreads, saveThreadChat, deleteThread, deleteAllThreads, getModelThreadHistory } from '../services/threadService.js';

const router = express.Router();

// Get thread history
router.get('/thread-history/:threadId', async (req, res) => {
  try {
    const history = await getThreadHistory(req.params.threadId);
    res.json(history);
  } catch (error) {
    console.error('Error loading thread history:', error);
    res.status(500).json({ error: 'Failed to load thread history' });
  }
});

// Get all threads
router.get('/', async (req, res) => {
  try {
    const threads = await getAllThreads();
    res.json({ threads });
  } catch (error) {
    console.error('Error listing threads:', error);
    res.status(500).json({ error: 'Failed to list threads' });
  }
});

// Delete a thread
router.delete('/:threadId', async (req, res) => {
  try {
    await deleteThread(req.params.threadId);
    res.json({ message: 'Thread deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to delete thread' });
  }
});

// Delete all threads
router.delete('/', async (req, res) => {
  try {
    await deleteAllThreads();
    res.json({ message: 'All threads deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to delete all threads' });
  }
});

// Create/update thread chat
router.post('/thread-chat', async (req, res) => {
  console.log('Received thread-chat request:', {
    threadId: req.body.threadId,
    prompt: req.body.prompt,
    models: req.body.models,
    previousMessagesCount: req.body.previousMessages?.length
  });
  
  const { threadId, prompt, models, previousMessages } = req.body;
  
  try {
    const config = await getDefaultApiConfig();
    console.log('Got API config:', {
      apisCount: config.apis.length,
      activeApisCount: config.apis.filter(api => api.active).length
    });
    
    const responses = [];
    
    // Get all available models first
    const availableModels = await getAllModels(config);
    console.log('Available models:', availableModels.map(m => m.id));
    
    // Get conversation history first to handle potential migration
    const { messages: threadHistory, threadId: actualThreadId } = await getThreadHistory(threadId);
    console.log('Got thread history:', {
      messagesCount: threadHistory?.length,
      actualThreadId
    });
    
    for (const modelId of models) {
      try {
        // Find the model in our available models
        const model = availableModels.find(m => m.id === modelId);
        if (!model) {
          throw new Error(`Model ${modelId} not found`);
        }
        
        const api = config.apis.find(a => a.id === model.apiId);
        if (!api) {
          throw new Error(`No API configuration found for model ${modelId}`);
        }
        
        // Get model-specific history
        const modelHistory = getModelThreadHistory(threadHistory, modelId);
        console.log('Thread History:', threadHistory);
        console.log('Model History:', modelHistory);
        
        let response;
        switch (api.provider) {
          case 'openai':
            const openai = new OpenAI({
              apiKey: api.key,
              baseURL: api.url || DEFAULT_PROVIDER_CONFIGS.openai.url
            });
            
            // Always include the current prompt at the end
            const messages = [...modelHistory, { role: 'user', content: prompt }];
            
            const completion = await openai.chat.completions.create({
              model: modelId,
              messages: messages,
            });
            
            response = completion.choices[0].message.content;
            const usage = completion.usage || null;
            
            responses.push({
              model: modelId,
              response,
              usage
            });
            break;
            
          default:
            throw new Error(`Unsupported provider: ${api.provider}`);
        }
        
      } catch (error) {
        console.error(`Error with model ${modelId}:`, error);
        responses.push({
          model: modelId,
          response: `Error: ${error.message}`,
          usage: null
        });
      }
    }
    
    // Save updated thread history using the actual thread ID
    const { threadId: finalThreadId, history: updatedHistory } = await saveThreadChat(
      actualThreadId, 
      prompt, 
      models, 
      responses, 
      previousMessages
    );
    
    res.json({ 
      responses, 
      threadId: finalThreadId,
      history: updatedHistory
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: error.message,
      responses: models.map(modelId => ({
        model: modelId,
        response: `Error: ${error.message}`
      }))
    });
  }
});

export default router; 
