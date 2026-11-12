import React, { useState } from 'react';
import {
  Calendar,
  CheckSquare,
  Clock,
  BookOpen,
  BookmarkCheck,
  FolderArchive,
  PenTool,
  ArrowRight,
  Plus,
  Sliders,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Trash2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, logActivity } from '../../db/database';
import confetti from 'canvas-confetti';
import type { DashboardWidgetConfig } from '../../db/types';

export const Dashboard: React.FC = () => {
  const {
    settings,
    setActiveTab,
    setSelectedSubjectId,
    setSelectedWorkId,
    setSelectedNoteId,
    openQuickAdd,
    updateSettings,
    addToast
  } = useApp();

  const [scratchpadText, setScratchpadText] = useState(() => localStorage.getItem('archive_scratchpad') || '');
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [collapsedWidgets, setCollapsedWidgets] = useState<Record<string, boolean>>({});

  // Real data queries
  const todayStr = new Date().toISOString().split('T')[0];

  const todaySchedules = useLiveQuery(() =>
    db.schedules.where('date').equals(todayStr).sortBy('startTime')
  ) || [];

  const pendingWork = useLiveQuery(() =>
    db.collegeWork
      .where('status')
      .anyOf('not_started', 'in_progress')
      .sortBy('dueDate')
  ) || [];

  const subjects = useLiveQuery(() =>
    db.subjects.where('isArchived').equals(0).toArray()
  ) || [];

  const modules = useLiveQuery(() => db.modules.toArray()) || [];

  const recentLogs = useLiveQuery(() =>
    db.academicLogs.orderBy('createdAt').reverse().limit(4).toArray()
  ) || [];

  const recentFiles = useLiveQuery(() =>
    db.files.orderBy('uploadDate').reverse().limit(4).toArray()
  ) || [];

  const recentNotes = useLiveQuery(() =>
    db.notes.orderBy('updatedAt').reverse().limit(3).toArray()
  ) || [];

  const upcomingExams = useLiveQuery(() =>
    db.collegeWork
      .where('category')
      .equals('examination')
      .filter(w => w.status !== 'completed' && w.status !== 'archived')
      .toArray()
  ) || [];

  // Greeting based on time of day
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Toggle widget collapse
  const toggleCollapse = (widgetId: string) => {
    setCollapsedWidgets(prev => ({ ...prev, [widgetId]: !prev[widgetId] }));
  };

  // Toggle widget enabled status
  const toggleWidget = async (widgetId: string) => {
    const updated = settings.dashboardWidgets.map(w =>
      w.id === widgetId ? { ...w, enabled: !w.enabled } : w
    );
    await updateSettings({ dashboardWidgets: updated });
  };

  // Move widget up or down
  const moveWidget = async (index: number, direction: 'up' | 'down') => {
    const list = [...settings.dashboardWidgets];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    await updateSettings({ dashboardWidgets: list.map((w, idx) => ({ ...w, order: idx + 1 })) });
  };

  // Save scratchpad
  const handleScratchpadChange = (text: string) => {
    setScratchpadText(text);
    localStorage.setItem('archive_scratchpad', text);
  };

  const handleConvertScratchpadToNote = async () => {
    if (!scratchpadText.trim()) return;
    const id = 'note_' + Date.now();
    await db.notes.add({
      id,
      title: 'Scratchpad Note — ' + new Date().toLocaleDateString(),
      content: scratchpadText,
      category: 'quick',
      tags: ['Scratchpad'],
      isFavorite: false,
      isPinned: false,
      attachmentIds: [],
      links: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    setScratchpadText('');
    localStorage.removeItem('archive_scratchpad');
    await logActivity('created', 'note', 'Scratchpad Note', id);
    addToast('Converted scratchpad to notebook note', 'success');
  };

  // Toggle task completion
  const handleCompleteWork = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'in_progress' : 'completed';
    await db.collegeWork.update(id, {
      status: newStatus,
      completedAt: newStatus === 'completed' ? Date.now() : undefined,
      updatedAt: Date.now()
    });

    if (newStatus === 'completed') {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
      addToast('Academic task completed!', 'success');
    }
  };

  // Toggle schedule event completion
  const handleCompleteSchedule = async (id: string, currentCompleted: boolean) => {
    await db.schedules.update(id, {
      isCompleted: !currentCompleted,
      completedAt: !currentCompleted ? Date.now() : undefined,
      updatedAt: Date.now()
    });
    if (!currentCompleted) {
      addToast('Timetable session checked off', 'success');
    }
  };

  // Immediate entity deletion handlers
  const handleDeleteSchedule = async (id: string, title: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.confirm(`Delete calendar event "${title}"?`)) {
      await db.schedules.delete(id);
      await logActivity('deleted', 'event', title, id);
      addToast('Event deleted', 'info');
    }
  };

  const handleDeleteWork = async (id: string, title: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.confirm(`Delete task "${title}"?`)) {
      await db.collegeWork.delete(id);
      await logActivity('deleted', 'work', title, id);
      addToast('Task deleted', 'info');
    }
  };

  const handleDeleteLog = async (id: string, title: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.confirm(`Delete academic log "${title}"?`)) {
      await db.academicLogs.delete(id);
      await logActivity('deleted', 'log', title, id);
      addToast('Log deleted', 'info');
    }
  };

  const handleDeleteFile = async (id: string, name: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.confirm(`Delete file "${name}" from vault?`)) {
      await db.files.delete(id);
      await logActivity('deleted', 'file', name, id);
      addToast('File deleted', 'info');
    }
  };

  const handleDeleteNote = async (id: string, title: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.confirm(`Delete note "${title}"?`)) {
      await db.notes.delete(id);
      await logActivity('deleted', 'note', title, id);
      addToast('Note deleted', 'info');
    }
  };

  const handleClearScratchpad = () => {
    if (window.confirm('Clear all scratchpad text?')) {
      setScratchpadText('');
      localStorage.removeItem('archive_scratchpad');
      addToast('Scratchpad cleared', 'info');
    }
  };

  // Calculate subject progress from actual topics
  const getSubjectProgress = (subjectId: string) => {
    const subModules = modules.filter(m => m.subjectId === subjectId);
    if (subModules.length === 0) return 0;
    let totalTopics = 0;
    let completedTopics = 0;
    subModules.forEach(m => {
      m.topics.forEach(t => {
        totalTopics++;
        if (t.isCompleted) completedTopics++;
      });
    });
    return totalTopics === 0 ? 0 : Math.round((completedTopics / totalTopics) * 100);
  };

  // Widget rendering dictionary
  const renderWidgetContent = (widget: DashboardWidgetConfig) => {
    const isCollapsed = collapsedWidgets[widget.id];

    switch (widget.id) {
      case 'today_schedule':
        return (
          <div className="vintage-card rounded p-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="font-serif font-bold text-sm text-[var(--text-primary)]">
                  Today&apos;s Timetable & Schedule
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openQuickAdd('event')}
                  className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded"
                  title="Schedule Event"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => toggleCollapse(widget.id)}
                  className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {!isCollapsed && (
              <div className="pt-3">
                {todaySchedules.length === 0 ? (
                  <div className="text-center py-6 text-[var(--text-secondary)]">
                    <Clock className="w-6 h-6 mx-auto mb-1 opacity-40 text-[var(--accent)]" />
                    <p className="text-xs font-serif">No calendar sessions scheduled for today</p>
                    <button
                      onClick={() => openQuickAdd('event')}
                      className="mt-2 text-[11px] font-mono text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add lecture or study routine
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todaySchedules.map(event => {
                      const subject = subjects.find(s => s.id === event.subjectId);
                      return (
                        <div
                          key={event.id}
                          className={`p-2.5 rounded border transition-all flex items-start gap-3 ${
                            event.isCompleted
                              ? 'bg-[var(--bg-inset)]/30 border-[var(--border-color)] opacity-60'
                              : 'bg-[var(--bg-surface-elevated)] border-[var(--border-color)] hover:border-[var(--text-primary)]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={event.isCompleted}
                            onChange={() => handleCompleteSchedule(event.id, event.isCompleted)}
                            className="mt-1 cursor-pointer accent-[var(--accent-olive)]"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-xs font-serif font-bold truncate ${event.isCompleted ? 'line-through' : 'text-[var(--text-primary)]'}`}>
                                {event.title}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-inset)] text-[var(--text-primary)] border border-[var(--border-color)] shrink-0">
                                {event.startTime} - {event.endTime}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--text-secondary)]">
                              {subject && (
                                <span className="font-mono text-[10px] text-[var(--accent)]">
                                  {subject.code}
                                </span>
                              )}
                              {event.location && (
                                <span className="truncate">📍 {event.location}</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleDeleteSchedule(event.id, event.title, e)}
                            className="p-1 text-[var(--text-secondary)] hover:text-[var(--accent-red)] rounded transition-colors shrink-0"
                            title="Delete Schedule Event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'pending_tasks':
        return (
          <div className="vintage-card rounded p-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="font-serif font-bold text-sm text-[var(--text-primary)]">
                  Pending Work & Deadlines ({pendingWork.length})
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openQuickAdd('work')}
                  className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded"
                  title="Add Work Item"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => toggleCollapse(widget.id)}
                  className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {!isCollapsed && (
              <div className="pt-3">
                {pendingWork.length === 0 ? (
                  <div className="text-center py-6 text-[var(--text-secondary)]">
                    <p className="text-xs font-serif">All collegiate assignments and tasks are up to date!</p>
                    <button
                      onClick={() => openQuickAdd('work')}
                      className="mt-2 text-[11px] font-mono text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Record upcoming assignment
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingWork.slice(0, 5).map(item => {
                      const subject = subjects.find(s => s.id === item.subjectId);
                      const isOverdue = item.dueDate < todayStr;
                      const isDueToday = item.dueDate === todayStr;

                      return (
                        <div
                          key={item.id}
                          className="p-2.5 rounded border border-[var(--border-color)] bg-[var(--bg-surface-elevated)] hover:border-[var(--text-primary)] transition-all flex items-start gap-3"
                        >
                          <input
                            type="checkbox"
                            checked={item.status === 'completed'}
                            onChange={() => handleCompleteWork(item.id, item.status)}
                            className="mt-1 cursor-pointer accent-[var(--accent-olive)]"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <button
                                onClick={() => {
                                  setSelectedWorkId(item.id);
                                  setActiveTab('work');
                                }}
                                className="text-xs font-serif font-bold text-[var(--text-primary)] hover:text-[var(--accent)] truncate text-left"
                              >
                                {item.title}
                              </button>
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                                  isOverdue
                                    ? 'bg-[var(--accent-red)]/15 border-[var(--accent-red)] text-[var(--accent-red)] font-bold'
                                    : isDueToday
                                    ? 'bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--accent)] font-bold'
                                    : 'bg-[var(--bg-inset)] border-[var(--border-color)] text-[var(--text-secondary)]'
                                }`}
                              >
                                {isOverdue ? 'Overdue: ' : isDueToday ? 'Due Today: ' : 'Due: '}
                                {item.dueDate}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--text-secondary)]">
                              {subject && (
                                <span className="font-mono text-[10px] text-[var(--accent)]">
                                  {subject.name}
                                </span>
                              )}
                              <span className="capitalize text-[10px] font-mono px-1 rounded bg-[var(--bg-inset)]/60">
                                {item.category.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleDeleteWork(item.id, item.title, e)}
                            className="p-1 text-[var(--text-secondary)] hover:text-[var(--accent-red)] rounded transition-colors shrink-0"
                            title="Delete Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                    {pendingWork.length > 5 && (
                      <button
                        onClick={() => setActiveTab('work')}
                        className="w-full text-center py-1.5 text-xs font-mono text-[var(--accent)] hover:underline inline-flex items-center justify-center gap-1"
                      >
                        <span>View all {pendingWork.length} pending items</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'subject_progress':
        return (
          <div className="vintage-card rounded p-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="font-serif font-bold text-sm text-[var(--text-primary)]">
                  Subject Syllabi & Topic Progress
                </h3>
              </div>
              <button
                onClick={() => toggleCollapse(widget.id)}
                className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>

            {!isCollapsed && (
              <div className="pt-3">
                {subjects.length === 0 ? (
                  <div className="text-center py-6 text-[var(--text-secondary)]">
                    <p className="text-xs font-serif">No active subjects registered in this semester</p>
                    <button
                      onClick={() => openQuickAdd('subject')}
                      className="mt-2 text-[11px] font-mono text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add course subject
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {subjects.slice(0, 4).map(sub => {
                      const progress = getSubjectProgress(sub.id);
                      return (
                        <div
                          key={sub.id}
                          onClick={() => {
                            setSelectedSubjectId(sub.id);
                            setActiveTab('subjects');
                          }}
                          className="p-2.5 rounded border border-[var(--border-color)] bg-[var(--bg-surface-elevated)] hover:border-[var(--accent)] cursor-pointer transition-all"
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-serif font-bold text-[var(--text-primary)] truncate">
                              {sub.name}
                            </span>
                            <span className="font-mono text-[10px] font-bold text-[var(--accent)]">
                              {progress}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[var(--bg-inset)] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${progress}%`, backgroundColor: sub.color || '#B66A3C' }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] font-mono mt-1">
                            <span>{sub.code}</span>
                            <span>{sub.credits} Credits</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'quick_notes':
        return (
          <div className="vintage-card rounded p-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <PenTool className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="font-serif font-bold text-sm text-[var(--text-primary)]">
                  Desk Scratchpad & Quick Notes
                </h3>
              </div>
              <button
                onClick={() => toggleCollapse(widget.id)}
                className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>

            {!isCollapsed && (
              <div className="pt-3 space-y-3">
                <div className="relative">
                  <textarea
                    rows={4}
                    value={scratchpadText}
                    onChange={(e) => handleScratchpadChange(e.target.value)}
                    placeholder="Quick academic notes, formulas, or sudden ideas (auto-saved locally)..."
                    className="w-full p-2.5 text-xs rounded vintage-input font-body notebook-ruled"
                  />
                  {scratchpadText.trim() && (
                    <div className="flex items-center justify-between gap-2 mt-1.5">
                      <button
                        onClick={handleClearScratchpad}
                        className="text-[11px] font-mono text-[var(--accent-red)] hover:underline inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Clear Scratchpad</span>
                      </button>
                      <button
                        onClick={handleConvertScratchpadToNote}
                        className="text-[11px] font-mono text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                      >
                        <span>Archive as permanent notebook note</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {recentNotes.length > 0 && (
                  <div>
                    <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider block mb-1.5 font-bold">
                      Recent Notebook Entries
                    </span>
                    <div className="space-y-1">
                      {recentNotes.map(n => (
                        <div
                          key={n.id}
                          className="w-full p-1.5 rounded hover:bg-[var(--bg-inset)]/60 text-xs flex items-center justify-between group transition-colors"
                        >
                          <button
                            onClick={() => {
                              setSelectedNoteId(n.id);
                              setActiveTab('notes');
                            }}
                            className="font-serif font-bold text-[var(--text-primary)] truncate text-left flex-1 hover:text-[var(--accent)]"
                          >
                            {n.title}
                          </button>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                              {new Date(n.updatedAt).toLocaleDateString()}
                            </span>
                            <button
                              onClick={(e) => handleDeleteNote(n.id, n.title, e)}
                              className="p-1 text-[var(--text-secondary)] hover:text-[var(--accent-red)] rounded"
                              title="Delete Note"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'recent_logs':
        return (
          <div className="vintage-card rounded p-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <BookmarkCheck className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="font-serif font-bold text-sm text-[var(--text-primary)]">
                  Recent Academic Logs
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openQuickAdd('log')}
                  className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded"
                  title="Record Log"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => toggleCollapse(widget.id)}
                  className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {!isCollapsed && (
              <div className="pt-3">
                {recentLogs.length === 0 ? (
                  <div className="text-center py-6 text-[var(--text-secondary)]">
                    <p className="text-xs font-serif">No academic logs recorded yet</p>
                    <button
                      onClick={() => openQuickAdd('log')}
                      className="mt-2 text-[11px] font-mono text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Record experiment or lecture log
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentLogs.map(l => (
                      <div
                        key={l.id}
                        className="p-2 rounded border border-[var(--border-color)] bg-[var(--bg-surface-elevated)] hover:border-[var(--text-primary)] transition-all flex items-center justify-between gap-3"
                      >
                        <div
                          onClick={() => setActiveTab('logbook')}
                          className="flex-1 min-w-0 cursor-pointer"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-serif font-bold text-[var(--text-primary)] truncate hover:text-[var(--accent)]">
                              Log #{String(l.logNumber).padStart(3, '0')}: {l.title}
                            </span>
                            <span className="text-[10px] font-mono text-[var(--text-secondary)] shrink-0">
                              {l.date}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1 mt-0.5 font-body">
                            {l.description}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteLog(l.id, l.title, e)}
                          className="p-1 text-[var(--text-secondary)] hover:text-[var(--accent-red)] rounded shrink-0"
                          title="Delete Log"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'recent_files':
        return (
          <div className="vintage-card rounded p-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <FolderArchive className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="font-serif font-bold text-sm text-[var(--text-primary)]">
                  Recent Digital Library Files
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openQuickAdd('file')}
                  className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded"
                  title="Upload File"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => toggleCollapse(widget.id)}
                  className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {!isCollapsed && (
              <div className="pt-3">
                {recentFiles.length === 0 ? (
                  <div className="text-center py-6 text-[var(--text-secondary)]">
                    <p className="text-xs font-serif">No local files stored in library</p>
                    <button
                      onClick={() => openQuickAdd('file')}
                      className="mt-2 text-[11px] font-mono text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Store PDF, image, or document
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {recentFiles.map(f => (
                      <div
                        key={f.id}
                        className="p-2 rounded border border-[var(--border-color)] bg-[var(--bg-surface-elevated)] hover:border-[var(--text-primary)] transition-all flex items-center justify-between gap-2"
                      >
                        <div
                          onClick={() => setActiveTab('files')}
                          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded bg-[var(--bg-inset)] flex items-center justify-center font-mono text-[10px] font-bold uppercase text-[var(--accent)] shrink-0">
                            {f.fileType.substring(0, 3)}
                          </div>
                          <div className="truncate flex-1">
                            <div className="text-xs font-mono font-medium text-[var(--text-primary)] truncate hover:text-[var(--accent)]">
                              {f.displayName}
                            </div>
                            <div className="text-[10px] text-[var(--text-secondary)] capitalize">
                              {f.category}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDeleteFile(f.id, f.displayName, e)}
                          className="p-1 text-[var(--text-secondary)] hover:text-[var(--accent-red)] rounded shrink-0"
                          title="Delete File"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'upcoming_exams':
        return (
          <div className="vintage-card rounded p-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[var(--accent-red)]" />
                <h3 className="font-serif font-bold text-sm text-[var(--text-primary)]">
                  Upcoming Examinations
                </h3>
              </div>
              <button
                onClick={() => toggleCollapse(widget.id)}
                className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>

            {!isCollapsed && (
              <div className="pt-3">
                {upcomingExams.length === 0 ? (
                  <div className="text-center py-4 text-[var(--text-secondary)]">
                    <p className="text-xs font-serif">No examinations scheduled currently</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcomingExams.map(ex => (
                      <div key={ex.id} className="p-2.5 rounded border border-[var(--accent-red)]/40 bg-[var(--accent-red)]/5 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-serif font-bold text-[var(--text-primary)]">{ex.title}</div>
                          <div className="text-[11px] text-[var(--text-secondary)]">Date: {ex.dueDate}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--accent-red)] text-white font-bold">
                            EXAM
                          </span>
                          <button
                            onClick={(e) => handleDeleteWork(ex.id, ex.title, e)}
                            className="p-1 text-[var(--text-secondary)] hover:text-[var(--accent-red)] rounded"
                            title="Delete Exam"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Scholar Greeting */}
      <div className="vintage-card rounded p-6 sm:p-8 border-l-4 border-l-[var(--accent)] relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--accent)] font-semibold block mb-1">
                Personal Academic Office
              </span>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--text-primary)] tracking-tight">
                {timeGreeting}, {settings.scholarName}.
              </h1>
              <p className="text-sm text-[var(--text-secondary)] font-body mt-1 max-w-xl">
                All records, laboratory journals, assignments, and documents are securely preserved in your local browser vault.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => openQuickAdd('work')}
                className="px-3 py-1.5 rounded vintage-btn-primary flex items-center gap-1.5 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Task</span>
              </button>
              <button
                onClick={() => openQuickAdd('event')}
                className="px-3 py-1.5 rounded vintage-btn-secondary flex items-center gap-1.5 text-xs"
              >
                <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Schedule</span>
              </button>
              <button
                onClick={() => setIsCustomizing(!isCustomizing)}
                className={`p-1.5 rounded vintage-btn-secondary ${isCustomizing ? 'border-[var(--accent)] text-[var(--accent)]' : ''}`}
                title="Customize Dashboard Layout"
              >
                <Sliders className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Customization Toolbar (When opened) */}
      {isCustomizing && (
        <div className="vintage-card-inset rounded p-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-3 border-b border-[var(--border-color)] pb-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="font-serif font-bold text-xs uppercase tracking-wider">
                Customise Dashboard Widgets
              </h3>
            </div>
            <button
              onClick={() => setIsCustomizing(false)}
              className="text-xs font-mono text-[var(--accent)] hover:underline"
            >
              Done Customising
            </button>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            Toggle visibility and reorder widgets to fit your academic routine:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {settings.dashboardWidgets.map((w, idx) => (
              <div
                key={w.id}
                className="p-2 rounded border border-[var(--border-color)] bg-[var(--bg-surface)] flex items-center justify-between text-xs"
              >
                <label className="flex items-center gap-2 cursor-pointer font-serif select-none">
                  <input
                    type="checkbox"
                    checked={w.enabled}
                    onChange={() => toggleWidget(w.id)}
                    className="cursor-pointer accent-[var(--accent)]"
                  />
                  <span>{w.name}</span>
                </label>
                <div className="flex items-center gap-1">
                  <button
                    disabled={idx === 0}
                    onClick={() => moveWidget(idx, 'up')}
                    className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    disabled={idx === settings.dashboardWidgets.length - 1}
                    onClick={() => moveWidget(idx, 'down')}
                    className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Widgets Multi-column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {settings.dashboardWidgets
          .filter(w => w.enabled)
          .map(w => (
            <React.Fragment key={w.id}>
              {renderWidgetContent(w)}
            </React.Fragment>
          ))}
      </div>
    </div>
  );
};
