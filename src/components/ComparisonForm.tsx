import React, { useState, FormEvent } from 'react';
import SavePromptDialog from './SavePromptDialog';
import { ComparisonFormProps } from '../shared/types/components.types';
import './ComparisonForm.css';

const ComparisonForm: React.FC<ComparisonFormProps> = ({ 
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
  setIsSubmitting,
  modelsLocked,
  history = [],
  setHistory = () => {}
}) => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSaveClick = (): void => {
    setShowSaveDialog(true);
  };

  const handleSaveClose = (): void => {
    setShowSaveDialog(false);
  };

  const handleSaved = (): void => {
    setShowSaveDialog(false);
    window.dispatchEvent(new Event('PROMPT_SAVED'));
  };

  const handleFormSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    
    try {
      setIsSubmitting(true);
      await handleSubmit();  // Just trigger the submit
    } catch (error) {
      console.error('Error submitting form:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
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

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleFormSubmit}>
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
              disabled={(!prompt && selectedModels.length === 0) || isSubmitting}
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
          show={showSaveDialog}
          prompt={prompt}
          onClose={handleSaveClose}
          onSaved={handleSaved}
        />
      )}
    </>
  );
};

export default ComparisonForm; 
