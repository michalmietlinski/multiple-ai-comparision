import express from 'express';
import { getDefaultApiConfig, getAllModels } from '../services/apiService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const config = await getDefaultApiConfig();
    const models = await getAllModels(config);
    res.json(models);
  } catch (error) {
    console.error('Error getting models:', error);
    res.status(500).json({ error: 'Failed to get models' });
  }
});

export default router; 
