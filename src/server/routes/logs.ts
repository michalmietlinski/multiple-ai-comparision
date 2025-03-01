import express, { Request, Response } from 'express';
import { getAllLogs, deleteConversation, clearAllLogs } from '../services/conversationService.js';
import { LogEntry, SuccessResponse, ErrorResponse } from '../types/logs.types.js';

const router = express.Router();

router.get('/', async (_req: Request, res: Response<LogEntry[] | ErrorResponse>) => {
  try {
    const logs = getAllLogs();
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

interface DeleteConversationParams {
  date: string;
  filename: string;
}

router.delete('/:date/:filename', async (
  req: Request<DeleteConversationParams>, 
  res: Response<SuccessResponse | ErrorResponse>
) => {
  try {
    const { date, filename } = req.params;
    await deleteConversation(date, filename);
    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Conversation not found') {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error deleting conversation:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
});

router.delete('/', async (_req: Request, res: Response<SuccessResponse | ErrorResponse>) => {
  try {
    await clearAllLogs();
    res.json({ message: 'All history cleared successfully' });
  } catch (error) {
    console.error('Error clearing history:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router; 
