/**
 * components.types.ts - Shared type definitions for React components
 * 
 * This file contains shared type definitions used by React components
 * across the application.
 */

import { 
  ThreadMessage, 
  ThreadStateWithCombinedMessages
} from './messages.types';
import { Model } from './api.types';

/**
 * Props for the ThreadedChat component
 */
export interface ThreadedChatProps {
  /** Array of messages to display */
  messages: ThreadMessage[];
  
  /** Array of selected model IDs */
  selectedModels: string[];
  
  /** Record of loading states by model ID */
  loading: Record<string, boolean>;
  
  /** Layout mode for the chat display */
  layout?: 'stacked' | 'grid';
  
  /** Whether to use full width layout */
  fullWidth?: boolean;
}

/**
 * Props for the ComparisonForm component
 */
export interface ComparisonFormProps {
  /** Current prompt text */
  prompt: string;
  
  /** Function to update the prompt text */
  setPrompt: (prompt: string) => void;
  
  /** Function to handle form submission */
  handleSubmit: () => Promise<void>;
  
  /** Array of selected model IDs */
  selectedModels: string[];
  
  /** Array of available models */
  availableModels: Model[];
  
  /** Function to toggle model selection */
  handleModelToggle: (modelId: string) => void;
  
  /** Whether models are currently loading */
  modelsLoading: boolean;
  
  /** Error message for models loading, if any */
  modelsError: string | null;
  
  /** Function to clear the form */
  clearForm: () => void;
  
  /** Whether the form is currently submitting */
  isSubmitting: boolean;
  
  /** Function to update the submitting state */
  setIsSubmitting: (value: boolean) => void;
  
  /** Whether model selection is locked */
  modelsLocked: boolean;
  
  /** Array of message history */
  history: ThreadMessage[];
  
  /** Function to update the message history */
  setHistory: (history: ThreadMessage[]) => void;
}

/**
 * Props for the ThreadHistoryPanel component
 */
export interface ThreadHistoryPanelProps {
  /** Whether to show the history panel */
  showHistory: boolean;
  
  /** Function to update the show history state */
  setShowHistory: (show: boolean) => void;
  
  /** Array of threads to display */
  threads: ThreadStateWithCombinedMessages[];
  
  /** Whether threads are currently loading */
  threadsLoading: boolean;
  
  /** Function to load a thread */
  loadThread: (threadId: string) => void;
  
  /** Function to delete a thread */
  deleteThread: (threadId: string) => void;
  
  /** Function to clear all threads */
  clearAllThreads: () => void;
  
  /** Record of deleting states by thread ID */
  deletingThreads: Record<string, boolean>;
}

/**
 * Props for the SavePromptDialog component
 */
export interface SavePromptDialogProps {
  /** Whether to show the dialog */
  show: boolean;
  
  /** Function to handle dialog close */
  onClose: () => void;
  
  /** Current prompt text */
  prompt: string;
  
  /** Optional callback for when a prompt is saved */
  onSaved?: () => void;
} 
