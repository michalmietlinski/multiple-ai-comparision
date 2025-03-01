import express, { Request, Response } from 'express';
import path from 'path';
import { DIRECTORIES } from '../utils/directoryManager.js';
import { ErrorResponse, SavedPrompt, TypedRequest } from '../types/api.types.js';
import { 
  SavedPromptWithFilename, 
  ReorderRequest, 
  ReorderResponse,
  SavePromptRequest
} from '../types/prompts.types.js';
import { 
  readJsonFile, 
  writeJsonFile, 
  deleteFile, 
  readDirectory 
} from '../utils/storage.js';

const router = express.Router();
const PROMPTS_DIR = DIRECTORIES.PROMPTS;

// Get all saved prompts
router.get('/', async (_req: Request, res: Response<SavedPromptWithFilename[] | ErrorResponse>) => {
  try {
    const prompts = await readDirectory<SavedPrompt>(PROMPTS_DIR);
    const promptsWithFilenames = prompts.map((prompt, index) => ({
      ...prompt,
      filename: `${prompt.id}-${prompt.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`
    }));
    
    // Sort by order if exists, fallback to timestamp
    res.json(promptsWithFilenames.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }));
  } catch (error) {
    console.error('Error reading prompts:', error);
    res.status(500).json({ error: 'Failed to fetch prompts' });
  }
});

// Save a new prompt
router.post('/', async (
  req: TypedRequest<SavePromptRequest>,
  res: Response<SavedPromptWithFilename | ErrorResponse>
) => {
  try {
    const promptData: SavedPrompt = {
      ...req.body,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    
    const filename = `${promptData.id}-${promptData.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    await writeJsonFile(
      path.join(PROMPTS_DIR, filename),
      promptData
    );
    
    res.status(201).json({ ...promptData, filename });
  } catch (error) {
    console.error('Error saving prompt:', error);
    res.status(500).json({ error: 'Failed to save prompt' });
  }
});

interface DeletePromptParams {
  id: string;
}

// Delete a prompt
router.delete('/:id', async (
  req: Request<DeletePromptParams>,
  res: Response<void | ErrorResponse>
) => {
  try {
    const prompts = await readDirectory<SavedPrompt>(PROMPTS_DIR);
    const prompt = prompts.find(p => p.id === req.params.id);
    
    if (!prompt) {
      res.status(404).json({ error: 'Prompt not found' });
      return;
    }

    const filename = `${prompt.id}-${prompt.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    await deleteFile(path.join(PROMPTS_DIR, filename));
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting prompt:', error);
    res.status(500).json({ error: 'Failed to delete prompt' });
  }
});

// Reorder prompts
router.post('/reorder', async (
  req: TypedRequest<ReorderRequest>,
  res: Response<ReorderResponse | ErrorResponse>
) => {
  try {
    const { prompts } = req.body;
    
    // Update each prompt with its new order
    await Promise.all(prompts.map(async (prompt, index) => {
      const promptPath = path.join(PROMPTS_DIR, prompt.filename);
      const promptData = await readJsonFile<SavedPrompt>(promptPath);
      promptData.order = index;
      await writeJsonFile(promptPath, promptData);
    }));
    
    res.json({ message: 'Prompts reordered successfully' });
  } catch (error) {
    console.error('Error reordering prompts:', error);
    res.status(500).json({ error: 'Failed to reorder prompts' });
  }
});

export default router; 
