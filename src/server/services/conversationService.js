import fs from 'fs';
import path from 'path';
import { DIRECTORIES } from '../utils/directoryManager.js';

export const saveConversation = (models, prompt, responses) => {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toISOString().split('T')[1].replace(/:/g, '-').split('.')[0];
  const modelNames = models.join('_vs_');
  
  const fileName = `${dateStr}_${timeStr}_${modelNames}.json`;
  const filePath = path.join(DIRECTORIES.LOGS, dateStr);
  
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(filePath, { recursive: true });
  }
  
  const conversationData = {
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

export const getAllLogs = () => {
  const logs = [];
  const dates = fs.readdirSync(DIRECTORIES.LOGS);
  
  dates.forEach(date => {
    const dateDir = path.join(DIRECTORIES.LOGS, date);
    if (fs.statSync(dateDir).isDirectory()) {
      const files = fs.readdirSync(dateDir);
      files.forEach(file => {
        const filePath = path.join(dateDir, file);
        const conversation = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        logs.push({
          date,
          fileName: file,
          ...conversation
        });
      });
    }
  });
  
  return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

export const deleteConversation = async (date, filename) => {
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

export const clearAllLogs = async () => {
  const dates = fs.readdirSync(DIRECTORIES.LOGS);
  
  dates.forEach(date => {
    const dateDir = path.join(DIRECTORIES.LOGS, date);
    if (fs.statSync(dateDir).isDirectory()) {
      fs.rmSync(dateDir, { recursive: true, force: true });
    }
  });
}; 
