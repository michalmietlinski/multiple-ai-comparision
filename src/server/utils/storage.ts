import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { DIRECTORIES } from './directoryManager.js';

interface StorageOptions {
  pretty?: boolean;
  createDir?: boolean;
}

const defaultOptions: StorageOptions = {
  pretty: true,
  createDir: true
};

export async function readJsonFile<T>(filePath: string): Promise<T> {
  try {
    const content = await fsPromises.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    throw new Error(`Failed to read JSON file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function writeJsonFile<T>(
  filePath: string, 
  data: T, 
  options: StorageOptions = defaultOptions
): Promise<void> {
  try {
    const dirPath = path.dirname(filePath);
    if (options.createDir) {
      await fsPromises.mkdir(dirPath, { recursive: true });
    }
    
    const content = JSON.stringify(data, null, options.pretty ? 2 : 0);
    await fsPromises.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write JSON file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fsPromises.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw new Error(`Failed to delete file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export async function listFiles(dirPath: string, pattern?: RegExp): Promise<string[]> {
  try {
    const files = await fsPromises.readdir(dirPath);
    if (pattern) {
      return files.filter(file => pattern.test(file));
    }
    return files;
  } catch (error) {
    throw new Error(`Failed to list files in ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fsPromises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function readDirectory<T>(dirPath: string): Promise<T[]> {
  try {
    const files = await fsPromises.readdir(dirPath);
    const results: T[] = [];
    
    for (const file of files) {
      try {
        const filePath = path.join(dirPath, file);
        const content = await fsPromises.readFile(filePath, 'utf-8');
        results.push(JSON.parse(content));
      } catch (error) {
        console.error(`Error reading file ${file}:`, error);
      }
    }
    
    return results;
  } catch (error) {
    throw new Error(`Failed to read directory ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fsPromises.mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create directory ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function moveFile(oldPath: string, newPath: string): Promise<void> {
  try {
    await fsPromises.rename(oldPath, newPath);
  } catch (error) {
    throw new Error(`Failed to move file from ${oldPath} to ${newPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function copyFile(sourcePath: string, targetPath: string): Promise<void> {
  try {
    await fsPromises.copyFile(sourcePath, targetPath);
  } catch (error) {
    throw new Error(`Failed to copy file from ${sourcePath} to ${targetPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 
