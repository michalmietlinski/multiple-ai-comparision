import dotenv from 'dotenv';
import express from 'express';
import OpenAI from 'openai';
import cors from 'cors';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { DEFAULT_PROVIDER_CONFIGS } from './src/server/config/providerConfig.js';
import { initializeDirectories, DIRECTORIES, FILES } from './src/server/utils/directoryManager.js';
import { saveConversation, getAllLogs, deleteConversation, clearAllLogs } from './src/server/services/conversationService.js';
import { getDefaultApiConfig, getAllModels, addApiConfig, deleteApiConfig, updateApiConfig } from './src/server/services/apiService.js';
import { getThreadHistory, getAllThreads, saveThreadChat, deleteThread, deleteAllThreads, getModelThreadHistory } from './src/server/services/threadService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Initialize all required directories
await initializeDirectories();

const THREAD_LOGS_DIR = DIRECTORIES.THREAD_LOGS;
const API_CONFIG_PATH = FILES.API_CONFIG;
const CHANGELOG_PATH = FILES.CHANGELOG;
const PROMPTS_DIR = DIRECTORIES.PROMPTS;
const COLLECTIONS_DIR = DIRECTORIES.COLLECTIONS;

app.get('/api/health', (req, res) => {
  res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/logs', async (req, res) => {
  try {
    const logs = getAllLogs();
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/logs/:date/:filename', async (req, res) => {
  try {
    const { date, filename } = req.params;
    await deleteConversation(date, filename);
    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    if (error.message === 'Conversation not found') {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error deleting conversation:', error);
      res.status(500).json({ error: error.message });
    }
  }
});

app.delete('/api/logs', async (req, res) => {
  try {
    await clearAllLogs();
    res.json({ message: 'All history cleared successfully' });
  } catch (error) {
    console.error('Error clearing history:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/provider-apis', async (req, res) => {
  try {
    const config = await getDefaultApiConfig();
    res.json(config.apis);
  } catch (error) {
    console.error('Error reading APIs:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/provider-apis', async (req, res) => {
  try {
    const newApi = await addApiConfig(req.body);
    res.json(newApi);
  } catch (error) {
    console.error('Error adding API:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/provider-apis/:id', async (req, res) => {
  try {
    await deleteApiConfig(req.params.id);
    res.json({ message: 'API deleted successfully' });
  } catch (error) {
    console.error('Error deleting API:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/provider-apis/:id', async (req, res) => {
  try {
    const updatedApi = await updateApiConfig(req.params.id, req.body);
    res.json(updatedApi);
  } catch (error) {
    console.error('Error updating API:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/models', async (req, res) => {
  try {
    const config = await getDefaultApiConfig();
    const models = await getAllModels(config);
    res.json(models);
  } catch (error) {
    console.error('Error getting models:', error);
    res.status(500).json({ error: 'Failed to get models' });
  }
});

app.post('/api/thread-chat', async (req, res) => {
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
            break;
            
          default:
            throw new Error(`Unsupported provider: ${api.provider}`);
        }
        
        responses.push({
          model: modelId,
          response
        });
        
      } catch (error) {
        console.error(`Error with model ${modelId}:`, error);
        responses.push({
          model: modelId,
          response: `Error: ${error.message}`
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

// Thread management endpoints
app.get('/api/thread-history/:threadId', async (req, res) => {
  try {
    const history = await getThreadHistory(req.params.threadId);
    res.json(history);
  } catch (error) {
    console.error('Error loading thread history:', error);
    res.status(500).json({ error: 'Failed to load thread history' });
  }
});

app.get('/api/threads', async (req, res) => {
  try {
    const threads = await getAllThreads();
    res.json({ threads });
  } catch (error) {
    console.error('Error listing threads:', error);
    res.status(500).json({ error: 'Failed to list threads' });
  }
});

app.delete('/api/thread/:threadId', async (req, res) => {
  try {
    await deleteThread(req.params.threadId);
    res.json({ message: 'Thread deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to delete thread' });
  }
});

app.delete('/api/threads', async (req, res) => {
  try {
    await deleteAllThreads();
    res.json({ message: 'All threads deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to delete all threads' });
  }
});

app.get('/api/changelog', async (req, res) => {
  try {
    const changelog = JSON.parse(await fsPromises.readFile(CHANGELOG_PATH, 'utf-8'));
    res.json(changelog);
  } catch (error) {
    console.error('Error reading changelog:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all saved prompts
app.get('/api/prompts', async (req, res) => {
  try {
    const files = await fsPromises.readdir(PROMPTS_DIR);
    const prompts = await Promise.all(
      files
        .filter(file => file.endsWith('.json'))
        .map(async file => {
          const content = await fsPromises.readFile(path.join(PROMPTS_DIR, file), 'utf-8');
          return { ...JSON.parse(content), filename: file };
        })
    );
    // Sort by order if exists, fallback to timestamp
    res.json(prompts.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      return new Date(b.timestamp) - new Date(a.timestamp);
    }));
  } catch (error) {
    console.error('Error reading prompts:', error);
    res.status(500).json({ error: 'Failed to fetch prompts' });
  }
});

// Save a new prompt
app.post('/api/prompts', async (req, res) => {
  try {
    const promptData = req.body;
    const filename = `${Date.now()}-${promptData.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    await fsPromises.writeFile(
      path.join(PROMPTS_DIR, filename),
      JSON.stringify(promptData, null, 2),
      'utf-8'
    );
    res.status(201).json({ ...promptData, filename });
  } catch (error) {
    console.error('Error saving prompt:', error);
    res.status(500).json({ error: 'Failed to save prompt' });
  }
});

// Delete a prompt
app.delete('/api/prompts/:filename', async (req, res) => {
  try {
    await fsPromises.unlink(path.join(PROMPTS_DIR, req.params.filename));
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting prompt:', error);
    res.status(500).json({ error: 'Failed to delete prompt' });
  }
});

// Get all collections
app.get('/api/collections', async (req, res) => {
  try {
    const files = await fsPromises.readdir(COLLECTIONS_DIR);
    const collections = await Promise.all(
      files
        .filter(file => file.endsWith('.json'))
        .map(async file => {
          const content = await fsPromises.readFile(path.join(COLLECTIONS_DIR, file), 'utf-8');
          return { ...JSON.parse(content), id: path.basename(file, '.json') };
        })
    );
    res.json(collections);
  } catch (error) {
    console.error('Error reading collections:', error);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

// Create a new collection
app.post('/api/collections', async (req, res) => {
  try {
    const { name } = req.body;
    const id = `${Date.now()}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const collectionData = {
      name,
      prompts: [],
      createdAt: new Date().toISOString()
    };
    
    await fsPromises.writeFile(
      path.join(COLLECTIONS_DIR, `${id}.json`),
      JSON.stringify(collectionData, null, 2),
      'utf-8'
    );
    
    res.status(201).json({ ...collectionData, id });
  } catch (error) {
    console.error('Error creating collection:', error);
    res.status(500).json({ error: 'Failed to create collection' });
  }
});

// Add prompt to collection
app.post('/api/collections/:collectionId/prompts', async (req, res) => {
  try {
    const { collectionId } = req.params;
    const { promptId } = req.body;
    
    // Read prompt and collection
    const promptPath = path.join(PROMPTS_DIR, promptId);
    const collectionPath = path.join(COLLECTIONS_DIR, `${collectionId}.json`);
    
    const promptData = JSON.parse(await fsPromises.readFile(promptPath, 'utf-8'));
    const collectionData = JSON.parse(await fsPromises.readFile(collectionPath, 'utf-8'));
    
    // Update prompt with collection ID
    promptData.collectionId = collectionId;
    await fsPromises.writeFile(promptPath, JSON.stringify(promptData, null, 2), 'utf-8');
    
    // Add prompt to collection if not already there
    if (!collectionData.prompts.includes(promptId)) {
      collectionData.prompts.push(promptId);
      await fsPromises.writeFile(collectionPath, JSON.stringify(collectionData, null, 2), 'utf-8');
    }
    
    res.json({ message: 'Prompt added to collection' });
  } catch (error) {
    console.error('Error adding prompt to collection:', error);
    res.status(500).json({ error: 'Failed to add prompt to collection' });
  }
});

// Remove prompt from collection
app.delete('/api/collections/:collectionId/prompts/:promptId', async (req, res) => {
  try {
    const { collectionId, promptId } = req.params;
    
    // Read prompt and collection
    const promptPath = path.join(PROMPTS_DIR, promptId);
    const collectionPath = path.join(COLLECTIONS_DIR, `${collectionId}.json`);
    
    const promptData = JSON.parse(await fsPromises.readFile(promptPath, 'utf-8'));
    const collectionData = JSON.parse(await fsPromises.readFile(collectionPath, 'utf-8'));
    
    // Remove collection ID from prompt
    delete promptData.collectionId;
    await fsPromises.writeFile(promptPath, JSON.stringify(promptData, null, 2), 'utf-8');
    
    // Remove prompt from collection
    collectionData.prompts = collectionData.prompts.filter(id => id !== promptId);
    await fsPromises.writeFile(collectionPath, JSON.stringify(collectionData, null, 2), 'utf-8');
    
    res.json({ message: 'Prompt removed from collection' });
  } catch (error) {
    console.error('Error removing prompt from collection:', error);
    res.status(500).json({ error: 'Failed to remove prompt from collection' });
  }
});

// Delete collection
app.delete('/api/collections/:collectionId', async (req, res) => {
  try {
    const { collectionId } = req.params;
    const collectionPath = path.join(COLLECTIONS_DIR, `${collectionId}.json`);
    
    // Read collection to get all prompts
    const collectionData = JSON.parse(await fsPromises.readFile(collectionPath, 'utf-8'));
    
    // Remove collection ID from all prompts in the collection
    for (const promptId of collectionData.prompts) {
      try {
        const promptPath = path.join(PROMPTS_DIR, promptId);
        const promptData = JSON.parse(await fsPromises.readFile(promptPath, 'utf-8'));
        delete promptData.collectionId;
        await fsPromises.writeFile(promptPath, JSON.stringify(promptData, null, 2), 'utf-8');
      } catch (error) {
        console.error(`Error updating prompt ${promptId}:`, error);
      }
    }
    
    // Delete collection file
    await fsPromises.unlink(collectionPath);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting collection:', error);
    res.status(500).json({ error: 'Failed to delete collection' });
  }
});

// Reorder prompts
app.post('/api/prompts/reorder', async (req, res) => {
  try {
    const { prompts } = req.body;
    
    // Update each prompt with its new order
    for (let i = 0; i < prompts.length; i++) {
      const promptPath = path.join(PROMPTS_DIR, prompts[i].filename);
      const promptData = JSON.parse(await fsPromises.readFile(promptPath, 'utf-8'));
      promptData.order = i;
      await fsPromises.writeFile(promptPath, JSON.stringify(promptData, null, 2), 'utf-8');
    }
    
    res.json({ message: 'Prompts reordered successfully' });
  } catch (error) {
    console.error('Error reordering prompts:', error);
    res.status(500).json({ error: 'Failed to reorder prompts' });
  }
});

app.post('/api/keys', async (req, res) => {
  try {
    const newApi = req.body;
    validateProviderConfig(newApi);
    
    const config = await getDefaultApiConfig();
    newApi.id = Date.now();
    newApi.active = true;
    
    config.apis.push(newApi);
    await fsPromises.writeFile(FILES.API_CONFIG, JSON.stringify(config, null, 2));
    
    res.json(newApi);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/keys/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedApi = req.body;
    validateProviderConfig(updatedApi);
    
    const config = JSON.parse(await fsPromises.readFile(FILES.API_CONFIG, 'utf-8'));
    const index = config.apis.findIndex(api => api.id === parseInt(id));
    
    if (index === -1) {
      return res.status(404).json({ error: 'API configuration not found' });
    }
    
    config.apis[index] = { ...config.apis[index], ...updatedApi };
    await fsPromises.writeFile(FILES.API_CONFIG, JSON.stringify(config, null, 2));
    
    res.json(config.apis[index]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
