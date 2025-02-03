import React, { useState } from 'react';
import axios from 'axios';
import './SavePromptDialog.css';

function SavePromptDialog({ prompt, onClose, onSaved }) {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!label.trim()) {
      setError('Please provide a label for the prompt');
      return;
    }

    try {
      setSaving(true);
      const response = await axios.post('http://localhost:3001/api/prompts', {
        label: label.trim(),
        description: description.trim(),
        prompt,
        timestamp: new Date().toISOString()
      });

      if (onSaved) {
        onSaved();
      }
      onClose();
    } catch (error) {
      console.error('Error saving prompt:', error);
      setError('Failed to save prompt');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="save-prompt-overlay">
      <div className="save-prompt-dialog">
        <h3>Save Prompt</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="promptLabel">Label *</label>
            <input
              id="promptLabel"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Enter a name for this prompt"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="promptDescription">Description (optional)</label>
            <textarea
              id="promptDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for this prompt"
              rows={3}
            />
          </div>

          {error && <div className="save-prompt-error">{error}</div>}

          <div className="dialog-buttons">
            <button 
              type="button" 
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={saving}
              className="primary"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SavePromptDialog; 
