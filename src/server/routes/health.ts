import express, { Request, Response } from 'express';

interface HealthResponse {
  status: 'ok';
  timestamp: string;
}

const router = express.Router();

router.get('/', (_req: Request, res: Response<HealthResponse>) => {
  res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});

export default router; 
