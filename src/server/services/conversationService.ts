import fs from 'fs';
import path from 'path';
import { DIRECTORIES } from '../utils/directoryManager.js';
import { ConversationData, ConversationResponse, LogEntry, SaveConversationResult } from '../types/logs.types.js';

export const saveConversation = (
  models: string[], 
  prompt: string, 
  responses: ConversationResponse[]
): SaveConversationResult => {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toISOString().split('T')[1].replace(/:/g, '-').split('.')[0];
  const modelNames = models.join('_vs_');
  
  const fileName = `${dateStr}_${timeStr}_${modelNames}.json`;
  const filePath = path.join(DIRECTORIES.LOGS, dateStr);
  
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(filePath, { recursive: true });
  }
  
  const conversationData: ConversationData = {
    timestamp: now.toISOString(),
    prompt,
    responses: responses.map(r => ({
      model: r.model,
      response: r.response
    }))
  };
  
  fs.writeFileSync(
    path.join(filePath, fileName),
    JSON.stringify(conversationData, null, 2)
  );
  
  return { fileName, dateStr };
};

export const getAllLogs = (): LogEntry[] => {
  const logs: LogEntry[] = [];
  
  if (!fs.existsSync(DIRECTORIES.LOGS)) {
    return logs;
  }
  
  const dates = fs.readdirSync(DIRECTORIES.LOGS);
  
  dates.forEach(date => {
    const dateDir = path.join(DIRECTORIES.LOGS, date);
    if (fs.statSync(dateDir).isDirectory()) {
      const files = fs.readdirSync(dateDir);
      files.forEach(file => {
        const filePath = path.join(dateDir, file);
        const conversation = JSON.parse(fs.readFileSync(filePath, 'utf8')) as ConversationData;
        logs.push({
          date,
          fileName: file,
          ...conversation
        });
      });
    }
  });
  
  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const deleteConversation = async (date: string, filename: string): Promise<void> => {
  const filePath = path.join(DIRECTORIES.LOGS, date, filename);
  
  if (!fs.existsSync(filePath)) {
    throw new Error('Conversation not found');
  }
  
  fs.unlinkSync(filePath);
  
  // Remove date directory if empty
  const dateDir = path.join(DIRECTORIES.LOGS, date);
  if (fs.readdirSync(dateDir).length === 0) {
    fs.rmdirSync(dateDir);
  }
};

export const clearAllLogs = async (): Promise<void> => {
  if (!fs.existsSync(DIRECTORIES.LOGS)) {
    return;
  }
  
  const dates = fs.readdirSync(DIRECTORIES.LOGS);
  
  dates.forEach(date => {
    const dateDir = path.join(DIRECTORIES.LOGS, date);
    if (fs.statSync(dateDir).isDirectory()) {
      fs.rmSync(dateDir, { recursive: true, force: true });
    }
  });
}; 
