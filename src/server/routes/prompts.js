import express from 'express';
import fsPromises from 'fs/promises';
import path from 'path';
import { DIRECTORIES } from '../utils/directoryManager.js';

const router = express.Router();
const PROMPTS_DIR = DIRECTORIES.PROMPTS;

// Get all saved prompts
router.get('/', async (req, res) => {
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
router.post('/', async (req, res) => {
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
router.delete('/:filename', async (req, res) => {
  try {
    await fsPromises.unlink(path.join(PROMPTS_DIR, req.params.filename));
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting prompt:', error);
    res.status(500).json({ error: 'Failed to delete prompt' });
  }
});

// Reorder prompts
router.post('/reorder', async (req, res) => {
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

export default router; 
