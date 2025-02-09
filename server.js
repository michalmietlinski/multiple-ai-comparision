import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { initializeDirectories } from './src/server/utils/directoryManager.js';

// Import routes
import healthRoutes from './src/server/routes/health.js';
import logsRoutes from './src/server/routes/logs.js';
import providerApisRoutes from './src/server/routes/provider-apis.js';
import modelsRoutes from './src/server/routes/models.js';
import threadsRoutes from './src/server/routes/threads.js';
import changelogRoutes from './src/server/routes/changelog.js';
import promptsRoutes from './src/server/routes/prompts.js';
import collectionsRoutes from './src/server/routes/collections.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'DELETE', 'PATCH'],
  credentials: true
}));

app.use(express.json());

// Initialize all required directories
await initializeDirectories();

// Mount routes
app.use('/api/health', healthRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/provider-apis', providerApisRoutes);
app.use('/api/models', modelsRoutes);
app.use('/api/threads', threadsRoutes);
app.use('/api/changelog', changelogRoutes);
app.use('/api/prompts', promptsRoutes);
app.use('/api/collections', collectionsRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
