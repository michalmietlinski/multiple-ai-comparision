import express, { Request, Response } from 'express';
import fsPromises from 'fs/promises';
import { FILES } from '../utils/directoryManager.js';

interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

interface ChangelogResponse {
  entries: ChangelogEntry[];
}

interface ErrorResponse {
  error: string;
}

const router = express.Router();

router.get('/', async (_req: Request, res: Response<ChangelogResponse | ErrorResponse>) => {
  try {
    const changelog = JSON.parse(await fsPromises.readFile(FILES.CHANGELOG, 'utf-8')) as ChangelogResponse;
    res.json(changelog);
  } catch (error) {
    console.error('Error reading changelog:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router; 
