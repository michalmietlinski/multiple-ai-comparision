import React, { useState } from 'react';
import SavePromptDialog from './SavePromptDialog';
import './ComparisonForm.css';

function ComparisonForm({ 
  prompt, 
  setPrompt, 
  handleSubmit, 
  selectedModels, 
  availableModels, 
  handleModelToggle, 
  modelsLoading, 
  modelsError,
  clearForm,
  isSubmitting,
  modelsLocked
}) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const handleSaveClick = () => {
    setShowSaveDialog(true);
  };

  const handleSaveClose = () => {
    setShowSaveDialog(false);
  };

  const handleSaved = () => {
    setShowSaveDialog(false);
    // Optionally show a success message or update UI
  };

  return (
    <>
      <div className="comparison-form-container">
        <div className="model-selection">
          {modelsLoading ? (
            <div className="loading">Loading available models...</div>
          ) : modelsError ? (
            <div className="error">{modelsError}</div>
          ) : availableModels.map(model => (
            <label 
              key={model.id}
              className={modelsLocked && !selectedModels.includes(model.id) ? 'disabled' : ''}
            >
              <input
                type="checkbox"
                checked={selectedModels.includes(model.id)}
                onChange={() => handleModelToggle(model.id)}
                disabled={modelsLocked && !selectedModels.includes(model.id)}
              />
              {model.name}
            </label>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt here..."
            rows={4}
            disabled={isSubmitting}
          />
          <div className="form-buttons">
            <button 
              type="button"
              className="save-prompt"
              onClick={handleSaveClick}
              disabled={!prompt.trim()}
            >
              Save Prompt
            </button>
            <button 
              className="clear-form"
              type="button"
              onClick={clearForm}
              disabled={!prompt && selectedModels.length === 0 || isSubmitting}
            >
              Clear Form
            </button>
            <button 
              type="submit" 
              disabled={!prompt || selectedModels.length === 0 || isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Compare Responses'}
            </button>
          </div>
        </form>
      </div>

      {showSaveDialog && (
        <SavePromptDialog
          prompt={prompt}
          onClose={handleSaveClose}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}

export default ComparisonForm; 
