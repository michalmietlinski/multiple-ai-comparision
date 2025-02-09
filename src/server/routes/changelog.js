import express from 'express';
import fsPromises from 'fs/promises';
import { FILES } from '../utils/directoryManager.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const changelog = JSON.parse(await fsPromises.readFile(FILES.CHANGELOG, 'utf-8'));
    res.json(changelog);
  } catch (error) {
    console.error('Error reading changelog:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router; 
