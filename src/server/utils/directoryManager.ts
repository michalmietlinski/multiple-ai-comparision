import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Moving up three levels to reach project root (from src/server/utils)
const ROOT_DIR = process.cwd();

interface Directories {
  LOGS: string;
  THREAD_LOGS: string;
  CONFIG: string;
  DATA: string;
  PROMPTS: string;
  COLLECTIONS: string;
}

interface Files {
  API_CONFIG: string;
  CHANGELOG: string;
}

interface ChangelogEntry {
  date: string;
  title: string;
  items: string[];
}

interface Changelog {
  entries: ChangelogEntry[];
}

export const DIRECTORIES: Directories = {
  LOGS: path.join(ROOT_DIR, 'logs'),
  THREAD_LOGS: path.join(ROOT_DIR, 'data', 'threads'),
  CONFIG: path.join(ROOT_DIR, 'config'),
  DATA: path.join(ROOT_DIR, 'data'),
  PROMPTS: path.join(ROOT_DIR, 'prompts'),
  COLLECTIONS: path.join(ROOT_DIR, 'collections')
};

export const FILES: Files = {
  API_CONFIG: path.join(DIRECTORIES.CONFIG, 'apis.json'),
  CHANGELOG: path.join(DIRECTORIES.DATA, 'changelog.json')
};

const DEFAULT_CHANGELOG: Changelog = {
  entries: [
    {
      date: "2024-03-20",
      title: "Added Multi-Provider Support",
      items: [
        "Support for OpenAI, DeepSeek, and Anthropic APIs",
        "Custom API endpoint configuration",
        "Multiple API keys management",
        "⚠️ DeepSeek and Anthropic integration needs testing"
      ]
    },
    {
      date: "2024-03-20",
      title: "UI/UX Improvements",
      items: [
        "Added interactive help system for API setup",
        "Improved navigation with active page highlighting",
        "Added changelog section to track updates",
        "Enhanced API key management interface"
      ]
    },
    {
      date: "2024-03-19",
      title: "Initial Release",
      items: [
        "Basic model comparison",
        "Conversation threading",
        "History management",
        "Response logging system"
      ]
    }
  ]
};

async function ensureDirectory(dir: string): Promise<void> {
  try {
    await fsPromises.access(dir);
  } catch {
    try {
      await fsPromises.mkdir(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    } catch (error) {
      console.error(`Failed to create directory ${dir}:`, error);
      throw error;
    }
  }
}

async function ensureFile(filePath: string, defaultContent: any, examplePath?: string): Promise<void> {
  try {
    await fsPromises.access(filePath);
  } catch {
    try {
      if (examplePath) {
        try {
          await fsPromises.access(examplePath);
          await fsPromises.copyFile(examplePath, filePath);
          console.log(`Created ${path.basename(filePath)} from example file`);
          return;
        } catch (error) {
          console.log(`Example file not found at ${examplePath}, creating with default content`);
        }
      }
      await fsPromises.writeFile(filePath, JSON.stringify(defaultContent, null, 2));
      console.log(`Created ${path.basename(filePath)} with default content`);
    } catch (error) {
      console.error(`Failed to create file ${filePath}:`, error);
      throw error;
    }
  }
}

export async function initializeDirectories(): Promise<void> {
  try {
    // Create base directories sequentially to avoid race conditions
    await ensureDirectory(DIRECTORIES.DATA);
    await ensureDirectory(DIRECTORIES.LOGS);
    await ensureDirectory(DIRECTORIES.THREAD_LOGS);
    await ensureDirectory(DIRECTORIES.CONFIG);
    await ensureDirectory(DIRECTORIES.PROMPTS);
    await ensureDirectory(DIRECTORIES.COLLECTIONS);

    // Ensure required files exist
    await ensureFile(
      FILES.API_CONFIG,
      { apis: [] },
      path.join(DIRECTORIES.CONFIG, 'apis.example.json')
    );
    
    await ensureFile(
      FILES.CHANGELOG,
      DEFAULT_CHANGELOG
    );

    console.log('Directory initialization completed successfully');
  } catch (error) {
    console.error('Failed to initialize directories:', error);
    throw new Error(`Directory initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 
