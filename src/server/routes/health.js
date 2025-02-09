import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router; 
