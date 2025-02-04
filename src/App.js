import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import ModelComparison from './components/ModelComparison';
import ThreadedComparison from './components/ThreadedComparison';
import ApiManager from './components/ApiManager';
import ThemeToggle from './components/ThemeToggle';
import PromptManager from './components/PromptManager';
import './App.css';

// Create a new component for the navigation
function Navigation() {
  const location = useLocation();
  
  return (
    <div className="nav-section">
      <h3>Navigation</h3>
      <ul>
        <li>
          <Link 
            to="/" 
            className={location.pathname === '/' ? 'active' : ''}
          >
            Model Comparison
          </Link>
        </li>
        <li>
          <Link 
            to="/threaded" 
            className={location.pathname === '/threaded' ? 'active' : ''}
          >
            Threaded Comparison
          </Link>
        </li>
      </ul>
    </div>
  );
}

// Create a new component for the changelog
function Changelog() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChangelog = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:3001/api/changelog');
        setEntries(response.data.entries);
      } catch (error) {
        console.error('Error fetching changelog:', error);
        setError('Failed to load changelog');
      } finally {
        setLoading(false);
      }
    };

    fetchChangelog();
  }, []);

  if (loading) {
    return (
      <div className="changelog-section">
        <h3>Latest Updates</h3>
        <div className="changelog-loading">Loading updates...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="changelog-section">
        <h3>Latest Updates</h3>
        <div className="changelog-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="changelog-section">
      <h3>Latest Updates</h3>
      <div className="changelog-entries">
        {entries.map((entry, index) => (
          <div key={`${entry.date}-${index}`} className="changelog-entry">
            <span className="changelog-date">{entry.date}</span>
            <div className="changelog-content">
              <p className="changelog-title">{entry.title}</p>
              <ul>
                {entry.items.map((item, itemIndex) => (
                  <li 
                    key={itemIndex}
                    className={item.includes('⚠️') ? 'warning' : ''}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
  const [healthStatus, setHealthStatus] = useState({
    server: 'checking',
    openai: 'checking' 
  });

  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem('theme') === 'dark'
  );

  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(
    window.innerWidth <= 768
  );

  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(true);

  const [currentPrompt, setCurrentPrompt] = useState('');

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      isDarkMode ? 'dark' : 'light'
    );
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      setIsLeftSidebarCollapsed(isMobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleLeftSidebar = () => {
    setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed);
  };

  const toggleRightSidebar = () => {
    setIsRightSidebarCollapsed(!isRightSidebarCollapsed);
  };

  const checkHealth = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/health', {
        timeout: 5000 // 5 second timeout
      });
      if (response.data.status === 'ok') {
        setHealthStatus(prev => ({ ...prev, server: 'online' }));
      } else {
        setHealthStatus(prev => ({ ...prev, server: 'offline' }));
      }
    } catch (error) {
      console.error('Server health check failed:', error);
      setHealthStatus(prev => ({ ...prev, server: 'offline' }));
    }

    try {
      const response = await axios.get('http://localhost:3001/api/models');
      setHealthStatus(prev => ({ 
        ...prev, 
        openai: response.data.length > 0 ? 'valid' : 'invalid' 
      }));
    } catch {
      setHealthStatus(prev => ({ ...prev, openai: 'invalid' }));
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleLoadPrompt = (promptText) => {
    setCurrentPrompt(promptText);
  };

  return (
    <BrowserRouter>
      <div className="app-container">
        <div className={`sidebar-title left ${isLeftSidebarCollapsed ? 'collapsed' : ''}`} onClick={toggleLeftSidebar}>
          Configuration & Help
        </div>
        
        <nav className={`sidebar-left ${isLeftSidebarCollapsed ? 'collapsed' : ''}`}>
          <ThemeToggle 
            isDark={isDarkMode} 
            onToggle={toggleTheme}
          />
          <div className="status-indicators">
            <div className={`status-item ${healthStatus.server}`}>
              <span className="status-dot"></span>
              Server: {healthStatus.server}
            </div>
            <div className={`status-item ${healthStatus.openai}`}>
              <span className="status-dot"></span>
              OpenAI API: {healthStatus.openai}
            </div>
          </div>

          <ApiManager />
          
          <Navigation />

          <div className="help-section">
            <h3>Quick Guide</h3>
            <div className="steps">
              <div className="step">
                <span className="step-number">1</span>
                <p>Select AI models to compare from the available options</p>
              </div>
              <div className="step">
                <span className="step-number">2</span>
                <p>Enter your prompt in the text area</p>
              </div>
              <div className="step">
                <span className="step-number">3</span>
                <p>Click "Compare Responses" to see results</p>
              </div>
              <div className="step">
                <span className="step-number">4</span>
                <p>For threaded chat, continue the conversation after initial response</p>
              </div>
            </div>
          </div>

          <Changelog />

       
        </nav>
        
        <button 
          className={`sidebar-toggle-left ${isLeftSidebarCollapsed ? 'collapsed' : ''}`}
          onClick={toggleLeftSidebar}
        >
          {isLeftSidebarCollapsed ? '→' : '←'}
        </button>

        <div className={`sidebar-title right ${isRightSidebarCollapsed ? 'collapsed' : ''}`} onClick={toggleRightSidebar}>
          Saved Prompts
        </div>

        <aside className={`sidebar-right ${isRightSidebarCollapsed ? 'collapsed' : ''}`}>
          <PromptManager onLoadPrompt={handleLoadPrompt} />
        </aside>

        <button 
          className={`sidebar-toggle-right ${isRightSidebarCollapsed ? 'collapsed' : ''}`}
          onClick={toggleRightSidebar}
        >
          {isRightSidebarCollapsed ? '←' : '→'}
        </button>

        <main className={`main-content 
          ${isLeftSidebarCollapsed ? 'left-collapsed' : 'left-expanded'}
          ${isRightSidebarCollapsed ? 'right-collapsed' : 'right-expanded'}`}
        >
          <Routes>
            <Route path="/" element={
              <ModelComparison 
                currentPrompt={currentPrompt}
                setCurrentPrompt={setCurrentPrompt}
              />
            } />
            <Route path="/threaded" element={
              <ThreadedComparison 
                currentPrompt={currentPrompt}
                setCurrentPrompt={setCurrentPrompt}
              />
            } />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
