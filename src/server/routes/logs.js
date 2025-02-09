import express from 'express';
import { getAllLogs, deleteConversation, clearAllLogs } from '../services/conversationService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const logs = getAllLogs();
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:date/:filename', async (req, res) => {
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

router.delete('/', async (req, res) => {
  try {
    await clearAllLogs();
    res.json({ message: 'All history cleared successfully' });
  } catch (error) {
    console.error('Error clearing history:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router; 
