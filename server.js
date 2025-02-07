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
import { DEFAULT_PROVIDER_CONFIGS, validateProviderConfig } from './src/server/config/providerConfig.js';
import { initializeDirectories, DIRECTORIES, FILES } from './src/server/utils/directoryManager.js';

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

const logsDir = DIRECTORIES.LOGS;
const THREAD_LOGS_DIR = DIRECTORIES.THREAD_LOGS;
const API_CONFIG_PATH = FILES.API_CONFIG;
const CHANGELOG_PATH = FILES.CHANGELOG;
const PROMPTS_DIR = DIRECTORIES.PROMPTS;
const COLLECTIONS_DIR = DIRECTORIES.COLLECTIONS;

const saveConversation = (models, prompt, responses) => {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toISOString().split('T')[1].replace(/:/g, '-').split('.')[0];
  const modelNames = models.join('_vs_');
  
  const fileName = `${dateStr}_${timeStr}_${modelNames}.json`;
  const filePath = path.join(DIRECTORIES.LOGS, dateStr);
  
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(filePath, { recursive: true });
  }
  
  const conversationData = {
    timestamp: now.toISOString(),
    prompt,
    responses: responses.map(r => ({
      model: r.model,
      response: r.response
    }))
  };
  
  fs.writeFileSync(
    path.join(filePath, fileName),
    JSON.stringify(conversationData, null, 2)
  );
  
  return { fileName, dateStr };
};

app.get('/api/health', (req, res) => {
  res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function getDefaultApiConfig() {
  const config = JSON.parse(await fsPromises.readFile(FILES.API_CONFIG, 'utf-8'));
  
  if (process.env.OPENAI_API_KEY) {
    const envApiExists = config.apis.some(api => 
      api.key === process.env.OPENAI_API_KEY && api.provider === 'openai'
    );
    
    if (!envApiExists) {
      const envApi = {
        id: Date.now(),
        name: 'OpenAI (ENV)',
        key: process.env.OPENAI_API_KEY,
        provider: 'openai',
        url: DEFAULT_PROVIDER_CONFIGS.openai.url,
        active: true
      };
      
      try {
        validateProviderConfig(envApi);
        config.apis.push(envApi);
        await fsPromises.writeFile(FILES.API_CONFIG, JSON.stringify(config, null, 2));
      } catch (error) {
        console.error('Invalid OpenAI ENV configuration:', error.message);
      }
    }
  }
  
  return config;
}

app.get('/api/models', async (req, res) => {
  try {
    const config = await getDefaultApiConfig();
    const activeApis = config.apis.filter(api => api.active);
    
    if (activeApis.length === 0) {
      return res.json([]);
    }
    
    const allModels = [];
    
    for (const api of activeApis) {
      try {
        let models = [];
        
        switch (api.provider) {
          case 'openai':
            const openai = new OpenAI({ 
              apiKey: api.key,
              baseURL: api.url || DEFAULT_PROVIDER_CONFIGS.openai.url
            });
            const openaiModels = await openai.models.list();
            models = openaiModels.data
              .filter(model => model.id.includes('gpt'))
              .map(model => ({
                id: model.id,
                name: model.id,
                provider: 'openai',
                apiId: api.id,
                url: api.url
              }));
            break;
            
          case 'gemini':
            models = DEFAULT_PROVIDER_CONFIGS.gemini.models.map(modelId => ({
              id: modelId,
              name: modelId,
              provider: 'gemini',
              apiId: api.id
            }));
            break;
            
          case 'deepseek':
          case 'anthropic':
            // For providers without model list API, use default configs
            models = DEFAULT_PROVIDER_CONFIGS[api.provider].models.map(modelId => ({
              id: modelId,
              name: modelId,
              provider: api.provider,
              apiId: api.id,
              url: api.url
            }));
            break;
            
          default:
            // For custom providers, allow manual model specification
            if (api.models) {
              models = api.models.map(modelId => ({
                id: modelId,
                name: modelId,
                provider: api.provider,
                apiId: api.id,
                url: api.url
              }));
            }
        }
        
        allModels.push(...models);
      } catch (error) {
        console.error(`Error fetching models for ${api.provider}:`, error);
      }
    }
    
    res.json(allModels);
  } catch (error) {
    console.error('Error getting models:', error);
    res.status(500).json({ error: 'Failed to get models' });
  }
});

app.post('/api/chat', async (req, res) => {
  const { models, prompt } = req.body;
  
  try {
    const config = await getDefaultApiConfig();
    const responses = [];
    
    // Get all available models first
    const availableModels = await getAllModels(config);
    
    for (const modelId of models) {
      try {
        // Find the exact model in our available models
        const modelConfig = availableModels.find(m => m.id === modelId);
        if (!modelConfig) {
          throw new Error(`Model ${modelId} not found in available models`);
        }
        
        const api = config.apis.find(api => 
          api.active && api.id === modelConfig.apiId
        );
        
        if (!api) {
          throw new Error(`No active API found for model ${modelId}`);
        }
        
        let response;
        
        switch (api.provider) {
          case 'openai':
            const openai = new OpenAI({
              apiKey: api.key,
              baseURL: api.url || DEFAULT_PROVIDER_CONFIGS.openai.url
            });
            const completion = await openai.chat.completions.create({
              model: modelId,
              messages: [{ role: 'user', content: prompt }]
            });
            response = completion.choices[0].message.content;
            break;
            
          case 'gemini':
            const genAI = new GoogleGenerativeAI(api.key);
            const model = genAI.getGenerativeModel({ model: modelId });
            const result = await model.generateContent(prompt);
            response = result.response.text();
            break;
            
          // Add other providers here
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
    
    const { fileName, dateStr } = saveConversation(models, prompt, responses);
    res.json({ responses, fileName, date: dateStr });
    
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
});

// Add helper function to get all models
async function getAllModels(config) {
  const activeApis = config.apis.filter(api => api.active);
  const allModels = [];
  
  for (const api of activeApis) {
    try {
      let models = [];
      
      switch (api.provider) {
        case 'openai':
          const openai = new OpenAI({ 
            apiKey: api.key,
            baseURL: api.url || DEFAULT_PROVIDER_CONFIGS.openai.url
          });
          const openaiModels = await openai.models.list();
          models = openaiModels.data
            .filter(model => model.id.includes('gpt'))
            .map(model => ({
              id: model.id,
              name: model.id,
              provider: 'openai',
              apiId: api.id,
              url: api.url
            }));
          break;
          
        case 'deepseek':
        case 'anthropic':
          models = DEFAULT_PROVIDER_CONFIGS[api.provider].models.map(modelId => ({
            id: modelId,
            name: modelId,
            provider: api.provider,
            apiId: api.id,
            url: api.url
          }));
          break;
          
        default:
          if (api.models) {
            models = api.models.map(modelId => ({
              id: modelId,
              name: modelId,
              provider: api.provider,
              apiId: api.id,
              url: api.url
            }));
          }
      }
      
      allModels.push(...models);
    } catch (error) {
      console.error(`Error fetching models for ${api.name}:`, error);
    }
  }
  
  return allModels;
}

app.get('/api/logs', async (req, res) => {
  try {
    const logs = [];
    // Read all date directories
    const dates = fs.readdirSync(DIRECTORIES.LOGS);
    
    dates.forEach(date => {
      const dateDir = path.join(DIRECTORIES.LOGS, date);
      if (fs.statSync(dateDir).isDirectory()) {
        // Read all conversation files for this date
        const files = fs.readdirSync(dateDir);
        files.forEach(file => {
          const filePath = path.join(dateDir, file);
          const conversation = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          logs.push({
            date,
            fileName: file,
            ...conversation
          });
        });
      }
    });
    
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/logs/:date/:filename', async (req, res) => {
  try {
    const { date, filename } = req.params;
    const filePath = path.join(DIRECTORIES.LOGS, date, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      
      // Remove date directory if empty
      const dateDir = path.join(DIRECTORIES.LOGS, date);
      if (fs.readdirSync(dateDir).length === 0) {
        fs.rmdirSync(dateDir);
      }
      
      res.json({ message: 'Conversation deleted successfully' });
    } else {
      res.status(404).json({ error: 'Conversation not found' });
    }
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/logs', async (req, res) => {
  try {
    const dates = fs.readdirSync(DIRECTORIES.LOGS);
    
    dates.forEach(date => {
      const dateDir = path.join(DIRECTORIES.LOGS, date);
      if (fs.statSync(dateDir).isDirectory()) {
        fs.rmSync(dateDir, { recursive: true, force: true });
      }
    });
    
    res.json({ message: 'All history cleared successfully' });
  } catch (error) {
    console.error('Error clearing history:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/thread-chat', async (req, res) => {
  const { threadId, prompt, models, previousMessages } = req.body;
  
  try {
    const config = await getDefaultApiConfig();
    const responses = [];
    
    // Get all available models first
    const availableModels = await getAllModels(config);
    
    // Load or initialize thread history
    const threadPath = path.join(THREAD_LOGS_DIR, `${threadId}.json`);
    let threadHistory = [];
    try {
      const threadData = await fsPromises.readFile(threadPath, 'utf8');
      threadHistory = JSON.parse(threadData);
    } catch {
      // New thread - add the first user message to history
      threadHistory = previousMessages || [{ role: 'user', content: prompt }];
    }
    
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
        
        // Get conversation history for this model
        const modelHistory = threadHistory
          .filter(entry => 
            entry.role === 'user' || // Include all user messages
            (entry.role === 'assistant' && entry.model === modelId) // Only this model's responses
          )
          .map(entry => {
            // Clean up the entry to match OpenAI's expected format
            const cleanEntry = {
              role: entry.role,
              content: entry.content
            };
            // Remove any null or undefined values
            return Object.fromEntries(
              Object.entries(cleanEntry).filter(([_, v]) => v != null)
            );
          })
          .filter(entry => entry.role && entry.content); // Ensure valid entries only
        
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
        
        // Add both user prompt and response to history
        if (!threadHistory.some(msg => msg.content === prompt && msg.role === 'user')) {
          threadHistory.push({ role: 'user', content: prompt });
        }
        threadHistory.push({ role: 'assistant', model: modelId, content: response });
        
      } catch (error) {
        console.error(`Error with model ${modelId}:`, error);
        responses.push({
          model: modelId,
          error: error.message
        });
      }
    }
    
    // Save updated thread history
    await fsPromises.writeFile(threadPath, JSON.stringify(threadHistory, null, 2));
    
    res.json({ responses, threadId });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add back the thread history endpoint with support for both formats
app.get('/api/thread-history/:threadId', async (req, res) => {
  const { threadId } = req.params;
  
  try {
    const filePath = path.join(THREAD_LOGS_DIR, `${threadId}.json`);
    const fileExists = await fsPromises.access(filePath)
      .then(() => true)
      .catch(() => false);

    if (!fileExists) {
      return res.json({ messages: [] });
    }

    const fileContent = await fsPromises.readFile(filePath, 'utf-8');
    
    try {
      // Try new format first (JSON array)
      const history = JSON.parse(fileContent);
      const messages = history.map(msg => ({
        role: msg.role,
        content: msg.content,
        model: msg.model
      }));
      return res.json({ messages });
    } catch {
      // Fall back to old format
      const logs = fileContent
        .trim()
        .split('\n')
        .filter(line => line.length > 0)
        .map(line => JSON.parse(line));

      const messages = [];
      const promptGroups = new Map();
      
      logs.forEach(log => {
        if (!promptGroups.has(log.prompt)) {
          promptGroups.set(log.prompt, []);
        }
        promptGroups.get(log.prompt).push(log);
      });

      promptGroups.forEach((groupLogs) => {
        messages.push({ 
          role: 'user', 
          content: groupLogs[0].prompt 
        });
        
        groupLogs.forEach(log => {
          messages.push({
            role: 'assistant',
            model: log.model,
            content: log.response
          });
        });
      });

      return res.json({ messages });
    }
  } catch (error) {
    console.error('Error loading thread history:', error);
    res.status(500).json({ error: 'Failed to load thread history' });
  }
});

// Update the threads listing endpoint with better error handling
app.get('/api/threads', async (req, res) => {
  try {
    const files = await fsPromises.readdir(THREAD_LOGS_DIR);
    const threads = [];
    
    for (const file of files) {
      try {
        const filePath = path.join(THREAD_LOGS_DIR, file);
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
    
    threads.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json({ threads });
  } catch (error) {
    console.error('Error listing threads:', error);
    res.status(500).json({ error: 'Failed to list threads' });
  }
});

app.delete('/api/thread/:threadId', async (req, res) => {
  const { threadId } = req.params;
  
  try {
    const filePath = path.join(THREAD_LOGS_DIR, `${threadId}.json`);
    await fsPromises.unlink(filePath);
    res.json({ message: 'Thread deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to delete thread' });
  }
});

app.delete('/api/threads', async (req, res) => {
  try {
    const files = await fsPromises.readdir(THREAD_LOGS_DIR);
    await Promise.all(
      files.map(file => 
        fsPromises.unlink(path.join(THREAD_LOGS_DIR, file))
      )
    );
    res.json({ message: 'All threads deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to delete all threads' });
  }
});

app.get('/api/provider-apis', async (req, res) => {
  try {
    const config = JSON.parse(await fsPromises.readFile(FILES.API_CONFIG, 'utf-8'));
    res.json(config.apis);
  } catch (error) {
    console.error('Error reading APIs:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/provider-apis', async (req, res) => {
  try {
    const { name, key, provider = 'openai', active = true, url } = req.body;
    const config = JSON.parse(await fsPromises.readFile(FILES.API_CONFIG, 'utf-8'));
    
    const newApi = {
      id: Date.now(),
      name,
      key,
      provider,
      active,
      url: url || DEFAULT_PROVIDER_CONFIGS[provider]?.url
    };
    
    config.apis.push(newApi);
    await fsPromises.writeFile(FILES.API_CONFIG, JSON.stringify(config, null, 2));
    
    res.json(newApi);
  } catch (error) {
    console.error('Error adding API:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/provider-apis/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const config = JSON.parse(await fsPromises.readFile(FILES.API_CONFIG, 'utf-8'));
    
    config.apis = config.apis.filter(api => api.id !== parseInt(id));
    await fsPromises.writeFile(FILES.API_CONFIG, JSON.stringify(config, null, 2));
    
    res.json({ message: 'API deleted successfully' });
  } catch (error) {
    console.error('Error deleting API:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/provider-apis/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const config = JSON.parse(await fsPromises.readFile(FILES.API_CONFIG, 'utf-8'));
    
    config.apis = config.apis.map(api => 
      api.id === parseInt(id) ? { ...api, ...updates } : api
    );
    
    await fsPromises.writeFile(FILES.API_CONFIG, JSON.stringify(config, null, 2));
    res.json(config.apis.find(api => api.id === parseInt(id)));
  } catch (error) {
    console.error('Error updating API:', error);
    res.status(500).json({ error: error.message });
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
