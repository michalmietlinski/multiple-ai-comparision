import React from 'react';
import { ResponseGridProps } from '../types/components.types';
import { ExportData } from '../types/storage.types';
import './ResponseGrid.css';

const ResponseGrid: React.FC<ResponseGridProps> = ({ 
  selectedModels, 
  availableModels, 
  loading, 
  responses, 
  savedFileName 
}) => {
  const handleExport = (model: string): void => {
    const response = responses[model];
    const exportData: ExportData = {
      model,
      response,
      timestamp: new Date().toISOString(),
      savedFileName
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `response-${model}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {savedFileName && (
        <div className="save-info">
          Conversation saved to: {savedFileName}
        </div>
      )}

      <div className="responses-grid">
        {selectedModels.map(model => (
          <div key={model} className="response-card">
            <div className="response-header">
              <h3>{availableModels.find(m => m.id === model)?.name || model}</h3>
              {responses[model] && !loading[model] && (
                <button 
                  className="export-response"
                  onClick={() => handleExport(model)}
                  title="Export this response"
                >
                  Export
                </button>
              )}
            </div>
            <div className="response-content">
              {loading[model] ? (
                <div className="loading">Loading...</div>
              ) : (
                <pre>{responses[model] || 'No response yet'}</pre>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default ResponseGrid; 
