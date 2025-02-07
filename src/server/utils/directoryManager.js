import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Moving up three levels to reach project root (from src/server/utils)
const ROOT_DIR = path.join(__dirname, '..', '..', '..');

export const DIRECTORIES = {
  LOGS: path.join(ROOT_DIR, 'logs'),
  THREAD_LOGS: path.join(ROOT_DIR, 'threadLogs'),
  CONFIG: path.join(ROOT_DIR, 'config'),
  DATA: path.join(ROOT_DIR, 'data'),
  PROMPTS: path.join(ROOT_DIR, 'prompts'),
  COLLECTIONS: path.join(ROOT_DIR, 'collections')
};

export const FILES = {
  API_CONFIG: path.join(DIRECTORIES.CONFIG, 'apis.json'),
  CHANGELOG: path.join(DIRECTORIES.DATA, 'changelog.json')
};

const DEFAULT_CHANGELOG = {
  entries: [
    {
      "date": "2024-03-20",
      "title": "Added Multi-Provider Support",
      "items": [
        "Support for OpenAI, DeepSeek, and Anthropic APIs",
        "Custom API endpoint configuration",
        "Multiple API keys management",
        "⚠️ DeepSeek and Anthropic integration needs testing"
      ]
    },
    {
      "date": "2024-03-20",
      "title": "UI/UX Improvements",
      "items": [
        "Added interactive help system for API setup",
        "Improved navigation with active page highlighting",
        "Added changelog section to track updates",
        "Enhanced API key management interface"
      ]
    },
    {
      "date": "2024-03-19",
      "title": "Initial Release",
      "items": [
        "Basic model comparison",
        "Conversation threading",
        "History management",
        "Response logging system"
      ]
    }
  ]
};

export async function initializeDirectories() {
  // Create base directories
  await Promise.all([
    fsPromises.mkdir(DIRECTORIES.LOGS, { recursive: true }),
    fsPromises.mkdir(DIRECTORIES.THREAD_LOGS, { recursive: true }),
    fsPromises.mkdir(DIRECTORIES.CONFIG, { recursive: true }),
    fsPromises.mkdir(DIRECTORIES.DATA, { recursive: true }),
    fsPromises.mkdir(DIRECTORIES.PROMPTS, { recursive: true }),
    fsPromises.mkdir(DIRECTORIES.COLLECTIONS, { recursive: true })
  ]);

  // Ensure apis.json exists
  try {
    await fsPromises.access(FILES.API_CONFIG);
  } catch {
    try {
      const examplePath = path.join(DIRECTORIES.CONFIG, 'apis.example.json');
      await fsPromises.access(examplePath);
      await fsPromises.copyFile(examplePath, FILES.API_CONFIG);
      console.log('Created apis.json from example file');
    } catch {
      await fsPromises.writeFile(FILES.API_CONFIG, JSON.stringify({
        apis: []
      }, null, 2));
      console.log('Created empty apis.json');
    }
  }

  // Ensure changelog.json exists
  try {
    await fsPromises.access(FILES.CHANGELOG);
  } catch {
    await fsPromises.writeFile(
      FILES.CHANGELOG, 
      JSON.stringify(DEFAULT_CHANGELOG, null, 2)
    );
    console.log('Created changelog.json');
  }
} 
