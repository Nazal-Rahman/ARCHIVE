import React, { useState, useEffect } from 'react';
import { Search, Plus, HardDrive, Moon, Sun, Menu } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getStorageEstimate, formatBytes } from '../../db/database';

interface HeaderProps {
  onToggleMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const { settings, setIsSearchOpen, openQuickAdd, toggleTheme } = useApp();
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [storageInfo, setStorageInfo] = useState<{ usage: number; quota: number }>({ usage: 0, quota: 0 });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    getStorageEstimate().then(est => {
      setStorageInfo({ usage: est.usage, quota: est.quota });
    });
  }, []);

  // Format date in vintage academic style
  const formattedDate = currentTime.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const formattedTime = settings.timeFormat === '24h'
    ? currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });

  return (
    <header className="sticky top-0 z-30 vintage-card border-b border-[var(--border-color)] px-4 py-2.5 sm:px-6 flex items-center justify-between shadow-xs">
      {/* Left: Mobile Toggle & Brand / Greeting */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-1.5 rounded vintage-btn-secondary"
          title="Open Menu"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5 text-[var(--text-primary)]" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-lg text-[var(--text-primary)] tracking-tight">
              ARCHIVE
            </span>
            <span className="hidden sm:inline-block text-xs font-mono px-1.5 py-0.5 rounded border border-[var(--border-color)] text-[var(--text-secondary)] bg-[var(--bg-inset)]/40">
              {settings.currentSemester}
            </span>
          </div>
          <p className="hidden md:block text-xs text-[var(--text-secondary)] font-body italic">
            {settings.greetingPrefix} {settings.scholarName}
          </p>
        </div>
      </div>

      {/* Center: Live Vintage Time & Date Stamp */}
      <div className="hidden sm:flex items-center gap-3 px-3 py-1 rounded border border-[var(--border-color)] bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] font-mono text-xs shadow-inner">
        <span className="text-[var(--text-secondary)]">{formattedDate}</span>
        <span className="w-1 h-1 rounded-full bg-[var(--accent)]" />
        <span className="font-bold text-[var(--accent)]">{formattedTime}</span>
      </div>

      {/* Right: Quick Tools */}
      <div className="flex items-center gap-2">
        {/* Storage Indicator */}
        <div 
          className="hidden md:flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded border border-[var(--border-color)] text-[var(--text-secondary)] bg-[var(--bg-surface)] hover:border-[var(--text-primary)] cursor-help transition-colors"
          title={`IndexedDB Storage: ${formatBytes(storageInfo.usage)} used of ${formatBytes(storageInfo.quota)} available on this device`}
        >
          <HardDrive className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>{formatBytes(storageInfo.usage)}</span>
        </div>

        {/* Global Search Shortcut */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded vintage-btn-secondary text-xs"
          title="Search anything (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span className="hidden md:inline">Search</span>
          <kbd className="hidden lg:inline text-[10px] bg-[var(--bg-inset)] px-1 py-0.5 rounded border border-[var(--border-color)] font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Quick Add Button */}
        <button
          onClick={() => openQuickAdd('work')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded vintage-btn-primary font-mono text-xs font-semibold shadow-xs"
          title="Quick Add Record"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded vintage-btn-secondary"
          title={settings.theme === 'vintage-light' ? 'Switch to Dark Library' : 'Switch to Vintage Parchment'}
          aria-label="Toggle Theme"
        >
          {settings.theme === 'vintage-light' ? (
            <Moon className="w-4 h-4 text-[var(--text-secondary)] hover:text-[var(--accent)]" />
          ) : (
            <Sun className="w-4 h-4 text-[var(--accent)]" />
          )}
        </button>
      </div>
    </header>
  );
};
