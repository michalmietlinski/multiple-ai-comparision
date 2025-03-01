import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { initializeDirectories } from './utils/directoryManager.js';

// Import routes
import healthRoutes from './routes/health.js';
import logsRoutes from './routes/logs.js';
import providerApisRoutes from './routes/provider-apis.js';
import modelsRoutes from './routes/models.js';
import threadsRoutes from './routes/threads.js';
import changelogRoutes from './routes/changelog.js';
import promptsRoutes from './routes/prompts.js';
import collectionsRoutes from './routes/collections.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Global error handler
const errorHandler = (err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: err.message || 'Internal server error' });
};

// Process-level promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Throw error to be caught by uncaughtException handler
  throw reason;
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Exit with error code
  process.exit(1);
});

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'DELETE', 'PATCH'],
  credentials: true
}));

app.use(express.json());

const startServer = async () => {
  try {
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

    // Error handling middleware (should be last)
    app.use(errorHandler);

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer().catch(error => {
  console.error('Server startup error:', error);
  process.exit(1);
}); 
