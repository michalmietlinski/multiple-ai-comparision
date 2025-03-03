import React, { useState, useEffect, FormEvent } from 'react';
import axios from 'axios';
import { ApiConfig, ProviderType, ProviderConfig } from '../types/api.types';
import './ApiManager.css';

const API_CHANGE_EVENT = 'api-config-changed';

const PROVIDER_INSTRUCTIONS: Record<ProviderType | 'general', ProviderConfig> = {
  openai: {
    title: "OpenAI API Key",
    steps: [
      "Go to platform.openai.com",
      "Sign in or create an account",
      "Navigate to API Keys section",
      "Click 'Create new secret key'",
      "Copy the key (you won't see it again!)"
    ],
    link: "https://platform.openai.com/api-keys"
  },
  anthropic: {
    title: "Anthropic API Key",
    steps: [
      "Go to console.anthropic.com",
      "Sign in or create an account",
      "Navigate to API Keys section",
      "Create a new API key",
      "Copy the key starting with 'sk-ant-'"
    ],
    link: "https://console.anthropic.com/account/keys"
  },
  deepseek: {
    title: "DeepSeek API Key",
    steps: [
      "Go to platform.deepseek.com",
      "Sign in or create an account",
      "Go to API section",
      "Generate new API key",
      "Copy the key"
    ],
    link: "https://platform.deepseek.com/"
  },
  gemini: {
    title: "Google AI (Gemini) API Key",
    steps: [
      "Go to ai.google.dev",
      "Sign in with your Google account",
      "Click 'Get API key'",
      "Create a new project or select existing one",
      "Copy your API key"
    ],
    link: "https://ai.google.dev/"
  },
  custom: {
    title: "Custom Provider API Key",
    steps: [
      "Enter your custom provider's API endpoint",
      "Add your API key",
      "Make sure the endpoint supports the required API format"
    ],
    link: "#"
  },
  general: {
    title: "Adding API Keys",
    steps: [
      "Select a provider from the list",
      "Enter a name for your API configuration",
      "Add your API key",
      "For custom providers, enter the API endpoint"
    ],
    link: "#"
  }
};

const ApiManager: React.FC = () => {
  const [apis, setApis] = useState<ApiConfig[]>([]);
  const [newApiKey, setNewApiKey] = useState('');
  const [newApiName, setNewApiName] = useState('');
  const [newProvider, setNewProvider] = useState<ProviderType>('openai');
  const [newApiUrl, setNewApiUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [modalProvider, setModalProvider] = useState<ProviderType | 'general' | null>(null);

  useEffect(() => {
    fetchApis();
  }, []);

  const fetchApis = async (): Promise<void> => {
    try {
      const response = await axios.get('http://localhost:3001/api/provider-apis');
      setApis(response.data);
    } catch (error) {
      console.error('Error fetching APIs:', error);
    }
  };

  const notifyApiChange = (): void => {
    window.dispatchEvent(new Event(API_CHANGE_EVENT));
  };

  const addApi = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (newApiKey && newApiName) {
      try {
        await axios.post('http://localhost:3001/api/provider-apis', {
          name: newApiName,
          key: newApiKey,
          provider: newProvider,
          url: newApiUrl
        });
        
        setNewApiKey('');
        setNewApiName('');
        setNewProvider('openai');
        setNewApiUrl('');
        setIsAdding(false);
        await fetchApis();
        notifyApiChange();
      } catch (error) {
        console.error('Error adding API:', error);
      }
    }
  };

  const removeApi = async (id: string): Promise<void> => {
    try {
      await axios.delete(`http://localhost:3001/api/provider-apis/${id}`);
      await fetchApis();
      notifyApiChange();
    } catch (error) {
      console.error('Error removing API:', error);
    }
  };

  const toggleApiStatus = async (id: string, currentActive: boolean): Promise<void> => {
    try {
      await axios.patch(`http://localhost:3001/api/provider-apis/${id}`, {
        active: !currentActive
      });
      await fetchApis();
      notifyApiChange();
    } catch (error) {
      console.error('Error toggling API status:', error);
    }
  };

  return (
    <div className="api-manager">
      <div className="api-header">
        <h3>API Keys</h3>
        <div className="api-header-controls">
          <button 
            className="help-icon"
            onClick={() => setModalProvider('general')}
          >
            ?
          </button>
          <button 
            className="add-api-button"
            onClick={() => setIsAdding(!isAdding)}
          >
            {isAdding ? '−' : '+'}
          </button>
        </div>
      </div>

      {modalProvider && (
        <div className="modal-overlay" onClick={() => setModalProvider(null)}>
          <div className="api-modal" onClick={e => e.stopPropagation()}>
            <button 
              className="modal-close"
              onClick={() => setModalProvider(null)}
            >
              ×
            </button>
            {modalProvider === 'general' ? (
              <>
                <h4>Adding API Keys</h4>
                <p>Select a provider and add your API key to enable model access. Each provider requires its own API key.</p>
                <p>Click the + button to add a new API key.</p>
                <div className="provider-list">
                  {Object.entries(PROVIDER_INSTRUCTIONS)
                    .filter(([key]) => key !== 'general')
                    .map(([key, provider]) => (
                      <button 
                        key={key}
                        className="provider-button"
                        onClick={() => setModalProvider(key as ProviderType)}
                      >
                        {provider.title} Setup →
                      </button>
                    ))}
                </div>
              </>
            ) : (
              <>
                <h4>{PROVIDER_INSTRUCTIONS[modalProvider]?.title}</h4>
                <ol>
                  {PROVIDER_INSTRUCTIONS[modalProvider]?.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
                <a 
                  href={PROVIDER_INSTRUCTIONS[modalProvider]?.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="provider-link"
                >
                  Get API Key →
                </a>
              </>
            )}
          </div>
        </div>
      )}

      {isAdding && (
        <form onSubmit={addApi} className="add-api-form">
          <input
            type="text"
            placeholder="API Name"
            value={newApiName}
            onChange={(e) => setNewApiName(e.target.value)}
          />
          <div className="select-wrapper">
            <select
              value={newProvider}
              onChange={(e) => setNewProvider(e.target.value as ProviderType)}
            >
              <option value="openai">OpenAI</option>
              <option value="deepseek">DeepSeek</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Google AI (Gemini)</option>
              <option value="custom">Custom Provider</option>
            </select>
            <button 
              className="help-icon small"
              onClick={(e) => {
                e.preventDefault();
                setModalProvider(newProvider);
              }}
            >
              ?
            </button>
          </div>
          {newProvider === 'custom' && (
            <input
              type="text"
              placeholder="API URL (e.g., https://api.example.com/v1)"
              value={newApiUrl}
              onChange={(e) => setNewApiUrl(e.target.value)}
            />
          )}
          <input
            type="password"
            placeholder="API Key"
            value={newApiKey}
            onChange={(e) => setNewApiKey(e.target.value)}
          />
          <button type="submit">Add</button>
        </form>
      )}

      <div className="api-list">
        {apis.map(api => (
          <div key={api.id} className="api-item">
            <div className="api-item-header">
              <span className="api-name">
                {api.name}
                <span className="api-provider">({api.provider})</span>
              </span>
              <div className="api-controls">
                <button
                  className={`toggle-api ${api.active ? 'active' : ''}`}
                  onClick={() => toggleApiStatus(api.id, api.active)}
                >
                  {api.active ? 'Active' : 'Inactive'}
                </button>
                <button
                  className="remove-api"
                  onClick={() => removeApi(api.id)}
                >
                  ×
                </button>
              </div>
            </div>
            {api.url && (
              <div className="api-url">
                URL: {api.url}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApiManager; 
