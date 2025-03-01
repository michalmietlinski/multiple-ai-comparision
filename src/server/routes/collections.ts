import express, { Request, Response } from 'express';
import fsPromises from 'fs/promises';
import path from 'path';
import { DIRECTORIES } from '../utils/directoryManager.js';
import { ErrorResponse } from '../types/api.types.js';
import { 
  CollectionWithId,
  CreateCollectionRequest,
  AddPromptRequest,
  CollectionParams,
  PromptParams,
  AddPromptResponse,
  RemovePromptResponse
} from '../types/collections.types';
import { TypedRequest } from '../types/api.types.js';

const router = express.Router();
const COLLECTIONS_DIR = DIRECTORIES.COLLECTIONS;
const PROMPTS_DIR = DIRECTORIES.PROMPTS;

// Get all collections
router.get('/', async (_req: Request, res: Response<CollectionWithId[] | ErrorResponse>) => {
  try {
    const files = await fsPromises.readdir(COLLECTIONS_DIR);
    const collections = await Promise.all(
      files
        .filter(file => file.endsWith('.json'))
        .map(async file => {
          const content = await fsPromises.readFile(path.join(COLLECTIONS_DIR, file), 'utf-8');
          return { ...JSON.parse(content), id: path.basename(file, '.json') } as CollectionWithId;
        })
    );
    res.json(collections);
  } catch (error) {
    console.error('Error reading collections:', error);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

// Create a new collection
router.post('/', async (
  req: TypedRequest<CreateCollectionRequest>,
  res: Response<CollectionWithId | ErrorResponse>
) => {
  try {
    const { name } = req.body;
    const id = `${Date.now()}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const collectionData: CollectionWithId = {
      id,
      name,
      prompts: [],
      createdAt: new Date().toISOString()
    };
    
    await fsPromises.writeFile(
      path.join(COLLECTIONS_DIR, `${id}.json`),
      JSON.stringify(collectionData, null, 2),
      'utf-8'
    );
    
    res.status(201).json(collectionData);
  } catch (error) {
    console.error('Error creating collection:', error);
    res.status(500).json({ error: 'Failed to create collection' });
  }
});

// Add prompt to collection
router.post('/:collectionId/prompts', async (
  req: TypedRequest<AddPromptRequest> & Request<CollectionParams>,
  res: Response<AddPromptResponse | ErrorResponse>
) => {
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
router.delete('/:collectionId/prompts/:promptId', async (
  req: Request<PromptParams>,
  res: Response<RemovePromptResponse | ErrorResponse>
) => {
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
    collectionData.prompts = collectionData.prompts.filter((id: string) => id !== promptId);
    await fsPromises.writeFile(collectionPath, JSON.stringify(collectionData, null, 2), 'utf-8');
    
    res.json({ message: 'Prompt removed from collection' });
  } catch (error) {
    console.error('Error removing prompt from collection:', error);
    res.status(500).json({ error: 'Failed to remove prompt from collection' });
  }
});

// Delete collection
router.delete('/:collectionId', async (
  req: Request<CollectionParams>,
  res: Response<void | ErrorResponse>
) => {
  try {
    const { collectionId } = req.params;
    const collectionPath = path.join(COLLECTIONS_DIR, `${collectionId}.json`);
    
    // Read collection to get all prompts
    const collectionData = JSON.parse(await fsPromises.readFile(collectionPath, 'utf-8'));
    
    // Remove collection ID from all prompts in the collection
    await Promise.all(collectionData.prompts.map(async (promptId: string) => {
      try {
        const promptPath = path.join(PROMPTS_DIR, promptId);
        const promptData = JSON.parse(await fsPromises.readFile(promptPath, 'utf-8'));
        delete promptData.collectionId;
        await fsPromises.writeFile(promptPath, JSON.stringify(promptData, null, 2), 'utf-8');
      } catch (error) {
        console.error(`Error updating prompt ${promptId}:`, error);
      }
    }));
    
    // Delete collection file
    await fsPromises.unlink(collectionPath);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting collection:', error);
    res.status(500).json({ error: 'Failed to delete collection' });
  }
});

export default router; 
