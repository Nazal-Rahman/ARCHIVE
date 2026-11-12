import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  PenTool,
  MoreHorizontal,
  X,
  BookOpen,
  FolderArchive,
  BookmarkCheck,
  BarChart3,
  Sliders,
  ShieldCheck
} from 'lucide-react';
import { useApp, type ActiveTab } from '../../context/AppContext';

interface MobileNavProps {
  isDrawerOpen: boolean;
  onCloseDrawer: () => void;
  onOpenDrawer: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isDrawerOpen, onCloseDrawer, onOpenDrawer }) => {
  const { activeTab, setActiveTab, settings } = useApp();

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    onCloseDrawer();
  };

  const primaryMobileTabs: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Desk', icon: LayoutDashboard },
    { id: 'scheduler', label: 'Schedule', icon: Calendar },
    { id: 'work', label: 'Work', icon: CheckSquare },
    { id: 'notes', label: 'Notes', icon: PenTool },
  ];

  const allDrawerTabs: { id: ActiveTab; label: string; icon: React.ElementType; desc: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Central academic desk overview' },
    { id: 'scheduler', label: 'Scheduler', icon: Calendar, desc: 'Timetables, routines & events' },
    { id: 'subjects', label: 'Subjects', icon: BookOpen, desc: 'Courses, syllabi & modules' },
    { id: 'work', label: 'College Work', icon: CheckSquare, desc: 'Assignments, labs, projects & deadlines' },
    { id: 'files', label: 'File Gallery', icon: FolderArchive, desc: 'Local documents, PDFs & media' },
    { id: 'logbook', label: 'Academic Logbook', icon: BookmarkCheck, desc: 'Daily academic documentation & logs' },
    { id: 'notes', label: 'Notes & Journal', icon: PenTool, desc: 'Parchment notebook & journals' },
    { id: 'progress', label: 'Progress Tracker', icon: BarChart3, desc: 'Academic metrics, topics & study stats' },
    { id: 'settings', label: 'Settings & Backup', icon: Sliders, desc: 'Preferences, ZIP export & database restore' },
  ];

  return (
    <>
      {/* Fixed Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-surface)] border-t border-[var(--border-color)] px-2 py-1 flex items-center justify-around shadow-lg">
        {primaryMobileTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded transition-colors ${
                isActive ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className={`text-[10px] font-mono mt-0.5 ${isActive ? 'font-bold' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* More Drawer Button */}
        <button
          onClick={onOpenDrawer}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded transition-colors ${
            isDrawerOpen ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] font-mono mt-0.5">More</span>
        </button>
      </nav>

      {/* Slide-out Drawer Overlay & Panel */}
      {isDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseDrawer}
          />

          {/* Drawer Sidebar */}
          <div className="relative w-4/5 max-w-sm bg-[var(--bg-surface)] h-full shadow-2xl flex flex-col z-10 border-r border-[var(--border-color)]">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-inset)]/30">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-[var(--text-primary)] text-[var(--bg-surface)] flex items-center justify-center font-serif font-bold text-sm">
                  A
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-[var(--text-primary)]">
                    ARCHIVE
                  </h3>
                  <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                    {settings.currentSemester}
                  </span>
                </div>
              </div>

              <button
                onClick={onCloseDrawer}
                className="p-1 rounded vintage-btn-secondary"
                aria-label="Close Navigation"
              >
                <X className="w-5 h-5 text-[var(--text-primary)]" />
              </button>
            </div>

            {/* All Tabs List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {allDrawerTabs.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded text-left transition-all ${
                      isActive
                        ? 'bg-[var(--text-primary)] text-[var(--bg-surface)] font-medium shadow-xs'
                        : 'text-[var(--text-primary)] hover:bg-[var(--bg-inset)]/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`} />
                    <div className="truncate">
                      <div className="text-xs font-mono font-semibold">{item.label}</div>
                      <div className={`text-[10px] truncate ${isActive ? 'text-[var(--bg-surface)]/80' : 'text-[var(--text-secondary)]'}`}>
                        {item.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-surface-elevated)] text-center">
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-[var(--text-primary)] font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent-olive)]" />
                <span>Private & Completely Local</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
