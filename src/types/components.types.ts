import { FormEvent } from 'react';
import { Message, ThreadHistory } from './chat.types';
import { Model } from './api.types';

export interface ThreadedChatProps {
  messages: Message[];
  selectedModels: string[];
  loading: Record<string, boolean>;
  layout?: 'stacked' | 'grid';
  fullWidth?: boolean;
}

export interface ComparisonFormProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  handleSubmit: () => Promise<void>;
  selectedModels: string[];
  availableModels: Model[];
  handleModelToggle: (modelId: string) => void;
  modelsLoading: boolean;
  modelsError: string | null;
  clearForm: () => void;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  modelsLocked: boolean;
  history: Message[];
  setHistory: (history: Message[]) => void;
}

export interface ThreadHistoryPanelProps {
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  threads: ThreadHistory[];
  threadsLoading: boolean;
  loadThread: (thread: ThreadHistory) => void;
  deleteThread: (threadId: string) => Promise<void>;
  clearAllThreads: () => Promise<void>;
  deletingThreads: Record<string, boolean>;
}

export interface SavePromptDialogProps {
  prompt: string;
  onClose: () => void;
  onSaved: () => void;
}

export interface ResponseGridProps {
  selectedModels: string[];
  availableModels: Model[];
  loading: Record<string, boolean>;
  responses: Record<string, string>;
  savedFileName?: string;
}

export interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
}

export interface HistoryPanelProps {
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  logs: Array<{
    fileName: string;
    prompt: string;
    responses: Record<string, string>;
    timestamp: string;
    date: string;
  }>;
  logsLoading: boolean;
  loadConversation: (log: any) => void;
  deleteConversation: (date: string, fileName: string, e: React.MouseEvent) => void;
  clearAllHistory: () => void;
  deletingLogs: Record<string, boolean>;
} 
