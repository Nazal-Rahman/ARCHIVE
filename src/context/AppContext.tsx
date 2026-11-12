import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, initializeDatabaseSeed, DEFAULT_SETTINGS } from '../db/database';
import type { AppSettings } from '../db/types';

export type ActiveTab = 
  | 'dashboard' 
  | 'scheduler' 
  | 'subjects' 
  | 'work' 
  | 'files' 
  | 'logbook' 
  | 'notes' 
  | 'progress' 
  | 'settings';

export interface Toast {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

export type QuickAddType = 'work' | 'event' | 'subject' | 'note' | 'log' | 'file';

interface AppContextValue {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedSubjectId: string | null;
  setSelectedSubjectId: (id: string | null) => void;
  selectedWorkId: string | null;
  setSelectedWorkId: (id: string | null) => void;
  selectedNoteId: string | null;
  setSelectedNoteId: (id: string | null) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isQuickAddOpen: boolean;
  setIsQuickAddOpen: (open: boolean) => void;
  quickAddType: QuickAddType;
  openQuickAdd: (type?: QuickAddType) => void;
  closeQuickAdd: () => void;
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type'], duration?: number) => void;
  removeToast: (id: string) => void;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  isDbReady: boolean;
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTabState] = useState<ActiveTab>('dashboard');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<QuickAddType>('work');
  
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isDbReady, setIsDbReady] = useState(false);

  // Load Settings from Dexie
  const liveSettings = useLiveQuery(() => db.settings.get('current_settings'));
  const settings: AppSettings = liveSettings || DEFAULT_SETTINGS;

  useEffect(() => {
    // Initialize DB with seed on first run
    initializeDatabaseSeed().then(() => {
      setIsDbReady(true);
    });
  }, []);

  // Sync theme with HTML data-theme attribute
  useEffect(() => {
    if (settings.theme === 'vintage-dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#1C1613');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#E9DFC9');
    }
  }, [settings.theme]);

  // Global Keyboard Shortcuts (Ctrl+K or Cmd+K for search, / for quick add)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsQuickAddOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const setActiveTab = (tab: ActiveTab) => {
    setActiveTabState(tab);
    // Scroll window to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openQuickAdd = (type: QuickAddType = 'work') => {
    setQuickAddType(type);
    setIsQuickAddOpen(true);
  };

  const closeQuickAdd = () => {
    setIsQuickAddOpen(false);
  };

  const addToast = (message: string, type: Toast['type'] = 'info', duration = 3500) => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, message, type, duration }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const merged = { ...settings, ...newSettings, updatedAt: Date.now() };
    await db.settings.put(merged);
    addToast('Settings updated successfully', 'success');
  };

  const toggleTheme = () => {
    const newTheme = settings.theme === 'vintage-light' ? 'vintage-dark' : 'vintage-light';
    updateSettings({ theme: newTheme });
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedSubjectId,
        setSelectedSubjectId,
        selectedWorkId,
        setSelectedWorkId,
        selectedNoteId,
        setSelectedNoteId,
        isSearchOpen,
        setIsSearchOpen,
        isQuickAddOpen,
        setIsQuickAddOpen,
        quickAddType,
        openQuickAdd,
        closeQuickAdd,
        toasts,
        addToast,
        removeToast,
        settings,
        updateSettings,
        isDbReady,
        toggleTheme
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
