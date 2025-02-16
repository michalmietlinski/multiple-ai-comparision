import React, { useState } from 'react';
import SavePromptDialog from './SavePromptDialog';
import './ComparisonForm.css';

// Add local storage helper for thread ID
const CURRENT_THREAD_KEY = 'currentThreadId';

const getStoredThreadId = () => {
  return localStorage.getItem(CURRENT_THREAD_KEY);
};

const setStoredThreadId = (threadId) => {
  if (threadId) {
    localStorage.setItem(CURRENT_THREAD_KEY, threadId);
  } else {
    localStorage.removeItem(CURRENT_THREAD_KEY);
  }
};

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
  setIsSubmitting,
  modelsLocked,
  history = [],
  setHistory = () => {}
}) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const threadId = getStoredThreadId();

  const handleSaveClick = () => {
    setShowSaveDialog(true);
  };

  const handleSaveClose = () => {
    setShowSaveDialog(false);
  };

  const handleSaved = () => {
    setShowSaveDialog(false);
    // Trigger a refresh in the PromptManager by updating lastUpdate
    window.dispatchEvent(new Event('PROMPT_SAVED'));
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    
    let response;
    let data;
    try {
      setIsSubmitting(true);
      
      const requestData = {
        prompt,
        models: selectedModels,
        threadId: threadId,
        previousMessages: history
      };
      console.log('Sending request to /api/threads/thread-chat:', requestData);
      
      response = await fetch('http://localhost:3001/api/threads/thread-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      data = await response.json();
      console.log('Received response:', data);

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }
      
      if (data.threadId) {
        setStoredThreadId(data.threadId);
      }

      if (data.history) {
        setHistory(data.history);
      }

      if (data.responses) {
        handleSubmit(data);
      } else {
        throw new Error('No responses received from server');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      if (!data?.responses) {
        alert(`Failed to send message: ${error.message || 'Unknown error occurred'}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear thread when starting new conversation
  const handleClear = () => {
    clearForm();
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
              onClick={handleClear}
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
