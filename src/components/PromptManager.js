import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './PromptManager.css';

function PromptManager({ onLoadPrompt }) {
  const [savedPrompts, setSavedPrompts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [activeCollection, setActiveCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showCollectionSelect, setShowCollectionSelect] = useState(null);
  const fileInputRef = useRef(null);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const [promptsResponse, collectionsResponse] = await Promise.all([
        axios.get('http://localhost:3001/api/prompts'),
        axios.get('http://localhost:3001/api/collections')
      ]);
      setSavedPrompts(promptsResponse.data);
      setCollections(collectionsResponse.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load saved prompts and collections');
    } finally {
      setLoading(false);
    }
  };

  const createCollection = async () => {
    if (!newCollectionName.trim()) return;
    
    try {
      await axios.post('http://localhost:3001/api/collections', {
        name: newCollectionName.trim(),
        prompts: []
      });
      setNewCollectionName('');
      setShowNewCollection(false);
      setLastUpdate(Date.now());
    } catch (error) {
      console.error('Error creating collection:', error);
      alert('Failed to create collection');
    }
  };

  const moveToCollection = async (promptId, collectionId) => {
    try {
      if (collectionId === '') {
        // Remove from current collection
        const prompt = savedPrompts.find(p => p.filename === promptId);
        if (prompt?.collectionId) {
          await axios.delete(`http://localhost:3001/api/collections/${prompt.collectionId}/prompts/${promptId}`);
        }
      } else {
        // Add to new collection
        await axios.post(`http://localhost:3001/api/collections/${collectionId}/prompts`, {
          promptId
        });
      }
      setShowCollectionSelect(null);
      setLastUpdate(Date.now());
    } catch (error) {
      console.error('Error moving prompt to collection:', error);
      alert('Failed to move prompt');
    }
  };

  const deleteCollection = async (collectionId) => {
    if (window.confirm('Are you sure you want to delete this collection and ALL prompts in it? This cannot be undone.')) {
      try {
        // First delete all prompts in this collection
        const promptsInCollection = savedPrompts.filter(p => p.collectionId === collectionId);
        for (const prompt of promptsInCollection) {
          await axios.delete(`http://localhost:3001/api/prompts/${prompt.filename}`);
        }

        // Then delete the collection
        await axios.delete(`http://localhost:3001/api/collections/${collectionId}`);
        setActiveCollection(null);
        setLastUpdate(Date.now());
      } catch (error) {
        console.error('Error deleting collection:', error);
        alert('Failed to delete collection');
      }
    }
  };

  useEffect(() => {
    loadPrompts();
  }, [lastUpdate]);

  useEffect(() => {
    const handlePromptSaved = () => {
      setLastUpdate(Date.now());
    };

    window.addEventListener('PROMPT_SAVED', handlePromptSaved);
    return () => {
      window.removeEventListener('PROMPT_SAVED', handlePromptSaved);
    };
  }, []);

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
        <div className="header-content">
          <h3>
            {activeCollection 
              ? `${collections.find(c => c.id === activeCollection)?.name || 'Collection'}` 
              : 'Saved Prompts'}
          </h3>
          {activeCollection && (
            <button
              className="delete-collection"
              onClick={() => deleteCollection(activeCollection)}
              title="Delete this collection"
            >
              Delete Collection
            </button>
          )}
        </div>
        <div className="prompt-manager-actions">
          <button 
            className="new-collection"
            onClick={() => setShowNewCollection(true)}
            title="Create new collection"
          >
            New Collection
          </button>
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

      {showNewCollection && (
        <div className="new-collection-form">
          <input
            type="text"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            placeholder="Collection name"
          />
          <button onClick={createCollection}>Create</button>
          <button onClick={() => setShowNewCollection(false)}>Cancel</button>
        </div>
      )}

      <div className="collections-list">
        <div 
          className={`collection-item ${activeCollection === null ? 'active' : ''}`}
          onClick={() => setActiveCollection(null)}
        >
          All Prompts
        </div>
        {collections.map(collection => (
          <div 
            key={collection.id}
            className={`collection-item ${activeCollection === collection.id ? 'active' : ''}`}
            onClick={() => setActiveCollection(collection.id)}
          >
            {collection.name}
          </div>
        ))}
      </div>

      <div className="prompt-list">
        {savedPrompts
          .filter(prompt => activeCollection === null || prompt.collectionId === activeCollection)
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .map(prompt => (
            <div key={prompt.filename} className="prompt-item">
              <div className="prompt-controls-bar">
                <div className="prompt-controls">
                  {showCollectionSelect === prompt.filename ? (
                    <div className="collection-select-container">
                      <select
                        className="collection-select"
                        value={prompt.collectionId || ''}
                        onChange={(e) => moveToCollection(prompt.filename, e.target.value)}
                        autoFocus
                        onBlur={() => setShowCollectionSelect(null)}
                      >
                        <option value="">No Collection</option>
                        {collections.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <button
                      className={`collection-toggle ${prompt.collectionId ? 'in-collection' : 'no-collection'}`}
                      onClick={() => setShowCollectionSelect(prompt.filename)}
                      title={prompt.collectionId ? 'Change collection' : 'Add to collection'}
                    >
                      {prompt.collectionId 
                        ? `Collection: ${collections.find(c => c.id === prompt.collectionId)?.name || '...'}`
                        : 'No Collection'
                      }
                    </button>
                  )}
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
              <div className="prompt-content">
                <div className="prompt-header">
                  <span className="prompt-label">{prompt.label}</span>
                </div>
                <div className="prompt-preview">
                  <div className="prompt-text">{prompt.prompt}</div>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export default PromptManager; 
