import express, { Request, Response } from 'express';
import { getDefaultApiConfig, getAllModels } from '../services/apiService.js';
import { ApiModel } from '../types/api.types.js';

interface ErrorResponse {
  error: string;
}

const router = express.Router();

router.get('/', async (_req: Request, res: Response<ApiModel[] | ErrorResponse>) => {
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
