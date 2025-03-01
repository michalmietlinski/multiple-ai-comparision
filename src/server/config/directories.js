import path from 'path';

export const DIRECTORIES = {
  THREAD_LOGS: path.join(process.cwd(), 'data', 'threads'),
  CONFIG: path.join(process.cwd(), 'data', 'config'),
  CACHE: path.join(process.cwd(), 'data', 'cache')
}; 
