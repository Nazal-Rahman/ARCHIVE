import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  CheckSquare,
  FolderArchive,
  BookmarkCheck,
  PenTool,
  BarChart3,
  Sliders,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useApp, type ActiveTab } from '../../context/AppContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse }) => {
  const { activeTab, setActiveTab } = useApp();

  // Dynamic live query counts for badges
  const pendingWorkCount = useLiveQuery(() => 
    db.collegeWork.where('status').anyOf('not_started', 'in_progress').count()
  ) || 0;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayEventsCount = useLiveQuery(() =>
    db.schedules.where('date').equals(todayStr).filter(e => !e.isCompleted).count()
  ) || 0;

  const notesCount = useLiveQuery(() => db.notes.count()) || 0;
  const filesCount = useLiveQuery(() => db.files.count()) || 0;
  const subjectsCount = useLiveQuery(() => db.subjects.where('isArchived').equals(0).count()) || 0;

  const navItems: { id: ActiveTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'scheduler', label: 'Scheduler', icon: Calendar, badge: todayEventsCount > 0 ? todayEventsCount : undefined },
    { id: 'subjects', label: 'Subjects', icon: BookOpen, badge: subjectsCount > 0 ? subjectsCount : undefined },
    { id: 'work', label: 'College Work', icon: CheckSquare, badge: pendingWorkCount > 0 ? pendingWorkCount : undefined },
    { id: 'files', label: 'File Gallery', icon: FolderArchive, badge: filesCount > 0 ? filesCount : undefined },
    { id: 'logbook', label: 'Logbook', icon: BookmarkCheck },
    { id: 'notes', label: 'Notes & Journal', icon: PenTool, badge: notesCount > 0 ? notesCount : undefined },
    { id: 'progress', label: 'Progress Tracker', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Sliders },
  ];

  return (
    <aside
      className={`hidden lg:flex flex-col border-r border-[var(--border-color)] bg-[var(--bg-surface)] transition-all duration-300 relative select-none z-20 ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
        <div className={`flex items-center gap-3 overflow-hidden ${collapsed ? 'justify-center w-full' : ''}`}>
          <div className="w-8 h-8 rounded bg-[var(--text-primary)] text-[var(--bg-surface)] flex items-center justify-center font-serif font-black text-lg shadow-sm border border-[var(--accent)] shrink-0">
            A
          </div>
          {!collapsed && (
            <div className="truncate">
              <h2 className="font-serif font-bold text-sm tracking-wide text-[var(--text-primary)]">
                ARCHIVE
              </h2>
              <span className="text-[10px] font-mono text-[var(--text-secondary)] tracking-wider uppercase block">
                Local Academic OS
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Items List */}
      <nav className="flex-1 py-4 px-2.5 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition-all text-left relative group ${
                isActive
                  ? 'bg-[var(--text-primary)] text-[var(--bg-surface)] font-medium shadow-xs border border-[var(--text-primary)]'
                  : 'text-[var(--text-primary)] hover:bg-[var(--bg-inset)]/60 hover:text-[var(--text-primary)]'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                isActive ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
              }`} />

              {!collapsed && (
                <span className="truncate text-xs font-mono tracking-tight flex-1">
                  {item.label}
                </span>
              )}

              {/* Badge */}
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--bg-inset)] text-[var(--text-primary)] border border-[var(--border-color)]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Local-First Privacy Badge */}
      {!collapsed && (
        <div className="p-3 mx-3 mb-3 rounded border border-[var(--border-color)] bg-[var(--bg-surface-elevated)]/60 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-[var(--text-primary)] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent-olive)]" />
            <span>100% Offline & Local</span>
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] font-body mt-0.5">
            Data never leaves this device
          </p>
        </div>
      )}

      {/* Collapse Toggle Button */}
      <div className="p-2 border-t border-[var(--border-color)] flex justify-end">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded vintage-btn-secondary w-full flex items-center justify-center text-xs"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label="Toggle Sidebar"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
