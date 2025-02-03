import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './PromptManager.css';

function PromptManager({ onLoadPrompt }) {
  const [savedPrompts, setSavedPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(0);
  const fileInputRef = useRef(null);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3001/api/prompts');
      setSavedPrompts(response.data);
    } catch (error) {
      console.error('Error loading prompts:', error);
      setError('Failed to load saved prompts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrompts();
  }, [lastUpdate]);

  const handleLoadPrompt = (prompt) => {
    if (onLoadPrompt) {
      onLoadPrompt(prompt.prompt);
    }
  };

  const deletePrompt = async (filename) => {
    if (window.confirm('Are you sure you want to delete this prompt?')) {
      try {
        await axios.delete(`http://localhost:3001/api/prompts/${filename}`);
        setLastUpdate(Date.now());
      } catch (error) {
        console.error('Error deleting prompt:', error);
        alert('Failed to delete prompt');
      }
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(savedPrompts, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prompts-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const prompts = JSON.parse(e.target.result);
          for (const prompt of prompts) {
            await axios.post('http://localhost:3001/api/prompts', {
              ...prompt,
              timestamp: new Date().toISOString()
            });
          }
          setLastUpdate(Date.now());
        } catch (error) {
          console.error('Error importing prompts:', error);
          alert('Failed to import prompts. Make sure the file format is correct.');
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Failed to read the file');
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return <div className="prompt-manager-loading">Loading saved prompts...</div>;
  }

  if (error) {
    return <div className="prompt-manager-error">{error}</div>;
  }

  return (
    <div className="prompt-manager">
      <div className="prompt-manager-header">
        <h3>Saved Prompts</h3>
        <div className="prompt-manager-actions">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".json"
            style={{ display: 'none' }}
          />
          <button 
            className="import-prompts"
            onClick={() => fileInputRef.current?.click()}
            title="Import prompts from JSON"
          >
            Import
          </button>
          <button 
            className="export-prompts"
            onClick={handleExport}
            title="Export prompts to JSON"
          >
            Export
          </button>
        </div>
      </div>
      <div className="prompt-list">
        {savedPrompts.map(prompt => (
          <div key={prompt.filename} className="prompt-item">
            <div className="prompt-header">
              <span className="prompt-label">{prompt.label}</span>
              <div className="prompt-controls">
                <button
                  className="load-prompt"
                  onClick={() => handleLoadPrompt(prompt)}
                  title="Load this prompt"
                >
                  Load
                </button>
                <button
                  className="delete-prompt"
                  onClick={() => deletePrompt(prompt.filename)}
                  title="Delete this prompt"
                >
                  ×
                </button>
              </div>
            </div>
            {prompt.description && (
              <div className="prompt-description">{prompt.description}</div>
            )}
          </div>
        ))}
        {savedPrompts.length === 0 && (
          <div className="no-prompts">No saved prompts yet</div>
        )}
      </div>
    </div>
  );
}

export default PromptManager; 
