import React, { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import ThreadedComparison from './components/ThreadedComparison';
import ApiManager from './components/ApiManager';
import ThemeToggle from './components/ThemeToggle';
import PromptManager from './components/PromptManager';
import './App.css';

interface HealthStatus {
  server: 'checking' | 'online' | 'offline';
  openai: 'checking' | 'valid' | 'invalid';
}

interface ChangelogEntry {
  date: string;
  title: string;
  items: string[];
}

const Changelog: React.FC = () => {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChangelog = async (): Promise<void> => {
      try {
        setLoading(true);
        const response = await axios.get<{ entries: ChangelogEntry[] }>('http://localhost:3001/api/changelog');
        // Sort entries by date in descending order (newest first)
        const sortedEntries = [...response.data.entries].sort((a, b) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        setEntries(sortedEntries);
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
};

const App: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    server: 'checking',
    openai: 'checking' 
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(
    localStorage.getItem('theme') === 'dark'
  );

  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState<boolean>(
    window.innerWidth <= 768
  );

  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState<boolean>(true);

  const [currentPrompt, setCurrentPrompt] = useState<string>('');

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
    const handleResize = (): void => {
      const isMobile = window.innerWidth <= 768;
      setIsLeftSidebarCollapsed(isMobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleLeftSidebar = (): void => {
    setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed);
  };

  const toggleRightSidebar = (): void => {
    setIsRightSidebarCollapsed(!isRightSidebarCollapsed);
  };

  const checkHealth = async (): Promise<void> => {
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

  const toggleTheme = (): void => {
    setIsDarkMode(!isDarkMode);
  };

  const handleLoadPrompt = (promptText: string): void => {
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
          
          <div className="help-section">
            <h3>Quick Guide</h3>
            <div className="steps">
              <div className="step">
                <span className="step-number">1</span>
                <p>Select AI models to compare from the available options</p>
              </div>
              <div className="step">
                <span className="step-number">2</span>
                <p>Enter your prompt and start a conversation</p>
              </div>
              <div className="step">
                <span className="step-number">3</span>
                <p>Compare responses and continue the thread</p>
              </div>
            </div>
          </div>

          <Changelog />
        </nav>

        <main className={`main-content ${isLeftSidebarCollapsed ? 'left-collapsed' : ''} ${isRightSidebarCollapsed ? 'right-collapsed' : ''}`}>
          <ThreadedComparison 
            currentPrompt={currentPrompt}
            setCurrentPrompt={setCurrentPrompt}
          />
        </main>

        <div 
          className={`sidebar-title right ${isRightSidebarCollapsed ? 'collapsed' : ''}`} 
          onClick={toggleRightSidebar}
        >
          Saved Prompts
        </div>
        
        <aside className={`sidebar-right ${isRightSidebarCollapsed ? 'collapsed' : ''}`}>
          <PromptManager onLoadPrompt={handleLoadPrompt} />
        </aside>
      </div>
    </BrowserRouter>
  );
};

export default App; 
