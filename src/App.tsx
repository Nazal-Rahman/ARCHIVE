import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { MobileNav } from './components/common/MobileNav';
import { ToastContainer } from './components/common/ToastContainer';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { QuickAddModal } from './components/common/QuickAddModal';

// Modules
import { Dashboard } from './components/dashboard/Dashboard';
import { Scheduler } from './components/scheduler/Scheduler';
import { Subjects } from './components/subjects/Subjects';
import { CollegeWorkView } from './components/work/CollegeWorkView';
import { FileGallery } from './components/files/FileGallery';
import { Logbook } from './components/logbook/Logbook';
import { NotesJournal } from './components/notes/NotesJournal';
import { ProgressTracker } from './components/progress/ProgressTracker';
import { SettingsView } from './components/settings/SettingsView';

const MainLayout: React.FC = () => {
  const { activeTab, settings, updateSettings, isDbReady } = useApp();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  if (!isDbReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E9DFC9] text-[#382A20]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-[#B66A3C] border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="font-serif font-bold text-lg">Opening Archive Vault...</h2>
          <p className="text-xs font-mono text-[#776653]">Initializing local-first IndexedDB database</p>
        </div>
      </div>
    );
  }

  const renderActiveModule = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'scheduler':
        return <Scheduler />;
      case 'subjects':
        return <Subjects />;
      case 'work':
        return <CollegeWorkView />;
      case 'files':
        return <FileGallery />;
      case 'logbook':
        return <Logbook />;
      case 'notes':
        return <NotesJournal />;
      case 'progress':
        return <ProgressTracker />;
      case 'settings':
        return <SettingsView />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-main)] text-[var(--text-primary)]">
      {/* Desktop Collapsible Sidebar */}
      <Sidebar
        collapsed={settings.sidebarCollapsed}
        onToggleCollapse={() => updateSettings({ sidebarCollapsed: !settings.sidebarCollapsed })}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        <Header onToggleMobileMenu={() => setIsMobileDrawerOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          {renderActiveModule()}
        </main>
      </div>

      {/* Mobile Navigation & Slide-out Drawer */}
      <MobileNav
        isDrawerOpen={isMobileDrawerOpen}
        onCloseDrawer={() => setIsMobileDrawerOpen(false)}
        onOpenDrawer={() => setIsMobileDrawerOpen(true)}
      />

      {/* Modals & Overlays */}
      <GlobalSearchModal />
      <QuickAddModal />
      <ToastContainer />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

export default App;
