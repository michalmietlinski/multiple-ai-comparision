import express from 'express';
import { getDefaultApiConfig, addApiConfig, deleteApiConfig, updateApiConfig } from '../services/apiService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const config = await getDefaultApiConfig();
    res.json(config.apis);
  } catch (error) {
    console.error('Error reading APIs:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const newApi = await addApiConfig(req.body);
    res.json(newApi);
  } catch (error) {
    console.error('Error adding API:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await deleteApiConfig(req.params.id);
    res.json({ message: 'API deleted successfully' });
  } catch (error) {
    console.error('Error deleting API:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const updatedApi = await updateApiConfig(req.params.id, req.body);
    res.json(updatedApi);
  } catch (error) {
    console.error('Error updating API:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router; 
