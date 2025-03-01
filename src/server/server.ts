import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { initializeDirectories } from './utils/directoryManager.js';
import util from 'util';

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

// Add error logging function
function logError(context: string, error: any) {
  console.error(`\n=== Error in ${context} ===`);
  console.error('Timestamp:', new Date().toISOString());
  
  // Handle [object Object] cases
  if (typeof error === 'object' && error !== null) {
    console.error('Error type:', error.constructor.name);
    console.error('Error properties:', Object.keys(error));
    
    // Try to extract useful information
    const errorInfo = {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      type: error?.type,
      syscall: error?.syscall,
      path: error?.path,
      errno: error?.errno,
      command: error?.command,
      phase: error?.phase,
      module: error?.module
    };
    
    console.error('Error details:', errorInfo);
  } else {
    console.error('Raw error:', error);
  }

  if (error?.cause) {
    console.error('Caused by:', error.cause);
  }

  // Log full error object for debugging
  try {
    console.error('Full error details:', util.inspect(error, { 
      depth: null, 
      colors: true,
      showHidden: true,
      getters: true,
      showProxy: true
    }));
  } catch (inspectError) {
    console.error('Failed to inspect error object:', inspectError);
  }
  console.error('=== End Error Log ===\n');
}

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n=== Unhandled Promise Rejection ===');
  console.error('Promise:', promise);
  logError('Unhandled Promise Rejection', reason);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  logError('Uncaught Exception', error);
  // Give the server a chance to finish current requests
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Error handling middleware
const errorHandler = (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logError('Express Error Handler', {
    ...err,
    path: req.path,
    method: req.method,
    query: req.query,
    body: req.body,
    headers: req.headers
  });
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  
  if (err.name === 'NotFoundError') {
    return res.status(404).json({ error: err.message });
  }
  
  // Default error
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    errorId: Date.now().toString(36) // Add error ID for tracking
  });
};

const startServer = async () => {
  try {
    // Initialize all required directories
    console.log('Initializing directories...');
    await initializeDirectories();
    console.log('Directories initialized successfully');

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

    const server = app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      logError('SIGTERM Signal', new Error('Server shutdown initiated'));
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logError('Server Startup', error);
    process.exit(1);
  }
};

startServer(); 
