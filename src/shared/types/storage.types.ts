/**
 * storage.types.ts - Shared type definitions for storage-related types
 * 
 * This file contains shared type definitions used across both client and server code
 * for storage-related functionality, such as saved prompts and collections.
 */

/**
 * Saved prompt structure
 * 
 * Represents a prompt that has been saved by the user.
 */
export interface SavedPrompt {
  /** Unique identifier for the prompt */
  id: string;
  
  /** The prompt text */
  prompt: string;
  
  /** Display label for the prompt */
  label: string;
  
  /** Timestamp when the prompt was saved */
  timestamp: string;
  
  /** Optional collection ID that this prompt belongs to */
  collectionId?: string;
  
  /** Optional order within the collection */
  order?: number;
}

/**
 * Saved prompt with filename
 * 
 * Extends the SavedPrompt interface with a filename for storage purposes.
 */
export interface SavedPromptWithFilename extends SavedPrompt {
  /** Filename where the prompt is stored */
  filename: string;
}

/**
 * Prompt collection structure
 * 
 * Represents a collection of related prompts.
 */
export interface PromptCollection {
  /** Unique identifier for the collection */
  id: string;
  
  /** Display name of the collection */
  name: string;
  
  /** Array of prompt IDs in this collection */
  prompts: string[];
}

/**
 * Export data structure
 * 
 * Represents data that can be exported from the application.
 */
export interface ExportData {
  /** Array of saved prompts */
  prompts: SavedPrompt[];
  
  /** Array of prompt collections */
  collections: PromptCollection[];
} 
