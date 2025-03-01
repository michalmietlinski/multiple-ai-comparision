import express, { Request, Response } from 'express';
import { getDefaultApiConfig, addApiConfig, deleteApiConfig, updateApiConfig } from '../services/apiService.js';
import { ApiProvider, SuccessResponse, ErrorResponse } from '../types/api.types.js';
import { TypedRequest } from '../types/api.types.js';

const router = express.Router();

router.get('/', async (_req: Request, res: Response<ApiProvider[] | ErrorResponse>) => {
  try {
    const config = await getDefaultApiConfig();
    res.json(config.apis);
  } catch (error) {
    console.error('Error reading APIs:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

type NewApiRequest = Omit<ApiProvider, 'id'>;

router.post('/', async (
  req: TypedRequest<NewApiRequest>,
  res: Response<ApiProvider | ErrorResponse>
) => {
  try {
    const newApi = await addApiConfig(req.body);
    res.json(newApi);
  } catch (error) {
    console.error('Error adding API:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

interface DeleteApiParams {
  id: string;
}

router.delete('/:id', async (
  req: Request<DeleteApiParams>,
  res: Response<SuccessResponse | ErrorResponse>
) => {
  try {
    await deleteApiConfig(req.params.id);
    res.json({ message: 'API deleted successfully' });
  } catch (error) {
    console.error('Error deleting API:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

interface UpdateApiParams {
  id: string;
}

type UpdateApiRequest = Partial<Omit<ApiProvider, 'id'>>;

router.patch('/:id', async (
  req: TypedRequest<UpdateApiRequest> & Request<UpdateApiParams>,
  res: Response<ApiProvider | ErrorResponse>
) => {
  try {
    const updatedApi = await updateApiConfig(req.params.id, req.body);
    res.json(updatedApi);
  } catch (error) {
    console.error('Error updating API:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router; 
