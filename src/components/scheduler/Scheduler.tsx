import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Check,
  RotateCcw,
  Trash2,
  Copy,
  Edit2,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, logActivity } from '../../db/database';
import type { ScheduleEvent, EventCategory, PriorityLevel, EventRecurrence } from '../../db/types';

export const Scheduler: React.FC = () => {
  const { settings, addToast } = useApp();

  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  // Modal for editing or creating an event
  const [editingEvent, setEditingEvent] = useState<Partial<ScheduleEvent> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Queries
  const allEvents = useLiveQuery(() => db.schedules.toArray()) || [];
  const subjects = useLiveQuery(() => db.subjects.where('isArchived').equals(0).toArray()) || [];

  // Navigation handlers
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Filtered events
  const filteredEvents = allEvents.filter(e => {
    if (selectedCategory !== 'all' && e.category !== selectedCategory) return false;
    if (selectedSubject !== 'all' && e.subjectId !== selectedSubject) return false;
    return true;
  });

  // Toggle complete
  const handleToggleComplete = async (event: ScheduleEvent) => {
    const updated = !event.isCompleted;
    await db.schedules.update(event.id, {
      isCompleted: updated,
      completedAt: updated ? Date.now() : undefined,
      updatedAt: Date.now()
    });
    addToast(updated ? 'Activity marked complete' : 'Activity rescheduled to incomplete', 'info');
  };

  // Delete event
  const handleDeleteEvent = async (id: string, title: string) => {
    if (window.confirm(`Delete calendar event "${title}"?`)) {
      await db.schedules.delete(id);
      await logActivity('deleted', 'event', title, id);
      addToast('Event removed from schedule', 'info');
    }
  };

  // Duplicate event
  const handleDuplicateEvent = async (event: ScheduleEvent) => {
    const id = 'sched_' + Date.now();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _, ...rest } = event;
    await db.schedules.add({
      ...rest,
      id,
      title: `${event.title} (Copy)`,
      isCompleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    addToast('Event duplicated', 'success');
  };

  // Save event from modal
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent?.title?.trim()) return;

    if (editingEvent.id) {
      // Update
      await db.schedules.update(editingEvent.id, {
        title: editingEvent.title.trim(),
        description: editingEvent.description?.trim() || '',
        date: editingEvent.date || new Date().toISOString().split('T')[0],
        startTime: editingEvent.startTime || '09:00',
        endTime: editingEvent.endTime || '10:00',
        category: (editingEvent.category || 'study') as EventCategory,
        priority: (editingEvent.priority || 'medium') as PriorityLevel,
        subjectId: editingEvent.subjectId || undefined,
        location: editingEvent.location?.trim() || undefined,
        recurrence: (editingEvent.recurrence || 'none') as EventRecurrence,
        color: editingEvent.color || '#B66A3C',
        updatedAt: Date.now()
      });
      await logActivity('updated', 'event', editingEvent.title.trim(), editingEvent.id);
      addToast('Schedule event updated', 'success');
    } else {
      // Create new
      const id = 'sched_' + Date.now();
      await db.schedules.add({
        id,
        title: editingEvent.title.trim(),
        description: editingEvent.description?.trim() || '',
        date: editingEvent.date || new Date().toISOString().split('T')[0],
        startTime: editingEvent.startTime || '09:00',
        endTime: editingEvent.endTime || '10:00',
        category: (editingEvent.category || 'study') as EventCategory,
        priority: (editingEvent.priority || 'medium') as PriorityLevel,
        subjectId: editingEvent.subjectId || undefined,
        location: editingEvent.location?.trim() || undefined,
        recurrence: (editingEvent.recurrence || 'none') as EventRecurrence,
        color: editingEvent.color || '#B66A3C',
        isCompleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      await logActivity('created', 'event', editingEvent.title.trim(), id);
      addToast('Added event to calendar', 'success');
    }

    setIsModalOpen(false);
    setEditingEvent(null);
  };

  // Render Month View
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startingDayIndex = (firstDayOfMonth.getDay() - settings.weekStartDay + 7) % 7;
    const totalDays = lastDayOfMonth.getDate();

    const daysArray: (number | null)[] = [];
    for (let i = 0; i < startingDayIndex; i++) {
      daysArray.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      daysArray.push(d);
    }

    const weekDays = settings.weekStartDay === 1
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const todayStr = new Date().toISOString().split('T')[0];

    return (
      <div className="vintage-card rounded overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-[var(--border-color)] bg-[var(--bg-inset)]/40 text-center py-2 text-xs font-mono font-bold text-[var(--text-secondary)]">
          {weekDays.map(day => (
            <div key={day}>{day}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-[var(--border-color)]">
          {daysArray.map((dayNum, idx) => {
            if (dayNum === null) {
              return <div key={`empty_${idx}`} className="min-h-24 sm:min-h-28 bg-[var(--bg-inset)]/10" />;
            }

            const monthStr = String(month + 1).padStart(2, '0');
            const dayStr = String(dayNum).padStart(2, '0');
            const dateStr = `${year}-${monthStr}-${dayStr}`;
            const isToday = dateStr === todayStr;

            const dayEvents = filteredEvents.filter(e => e.date === dateStr);

            return (
              <div
                key={dateStr}
                onClick={() => {
                  setEditingEvent({ date: dateStr, startTime: '09:00', endTime: '10:00', category: 'study', priority: 'medium' });
                  setIsModalOpen(true);
                }}
                className={`min-h-24 sm:min-h-28 p-1 sm:p-1.5 transition-colors cursor-pointer group hover:bg-[var(--bg-surface-elevated)] flex flex-col justify-between ${
                  isToday ? 'bg-[var(--accent)]/10' : 'bg-[var(--bg-surface)]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                      isToday
                        ? 'bg-[var(--accent)] text-white'
                        : 'text-[var(--text-primary)] group-hover:text-[var(--accent)]'
                    }`}
                  >
                    {dayNum}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {/* Day events badges */}
                <div className="space-y-1 overflow-y-auto max-h-20">
                  {dayEvents.slice(0, 3).map(ev => (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingEvent(ev);
                        setIsModalOpen(true);
                      }}
                      className={`text-[10px] font-mono px-1 py-0.5 rounded truncate border ${
                        ev.isCompleted
                          ? 'line-through opacity-50 bg-[var(--bg-inset)] border-[var(--border-color)]'
                          : 'bg-[var(--bg-surface-elevated)] border-[var(--border-color)] hover:border-[var(--accent)]'
                      }`}
                      style={{ borderLeftColor: ev.color || '#B66A3C', borderLeftWidth: '3px' }}
                      title={`${ev.startTime} - ${ev.title}`}
                    >
                      {ev.startTime} {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[9px] font-mono text-[var(--text-secondary)] text-center">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Agenda / List View
  const renderAgendaView = () => {
    const sorted = [...filteredEvents].sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return a.startTime.localeCompare(b.startTime);
    });

    if (sorted.length === 0) {
      return (
        <div className="vintage-card rounded p-12 text-center text-[var(--text-secondary)]">
          <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-40 text-[var(--accent)]" />
          <h3 className="font-serif text-base font-bold text-[var(--text-primary)]">No events match filter</h3>
          <p className="text-xs font-mono mt-1">Add activities or clear current filters.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {sorted.map(ev => {
          const subject = subjects.find(s => s.id === ev.subjectId);

          return (
            <div
              key={ev.id}
              className={`vintage-card rounded p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                ev.isCompleted ? 'opacity-60 bg-[var(--bg-inset)]/30' : 'bg-[var(--bg-surface)]'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => handleToggleComplete(ev)}
                  className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    ev.isCompleted
                      ? 'bg-[var(--accent-olive)] border-[var(--accent-olive)] text-white'
                      : 'border-[var(--border-color)] hover:border-[var(--accent)]'
                  }`}
                  title={ev.isCompleted ? 'Mark incomplete' : 'Mark completed'}
                >
                  {ev.isCompleted && <Check className="w-3.5 h-3.5" />}
                </button>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className={`text-sm font-serif font-bold ${ev.isCompleted ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
                      {ev.title}
                    </h4>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--bg-inset)] border border-[var(--border-color)] uppercase">
                      {ev.category}
                    </span>
                  </div>

                  {ev.description && (
                    <p className="text-xs text-[var(--text-secondary)] font-body mt-0.5 line-clamp-2">
                      {ev.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] font-mono text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="w-3 h-3 text-[var(--accent)]" />
                      {ev.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[var(--accent)]" />
                      {ev.startTime} - {ev.endTime}
                    </span>
                    {subject && (
                      <span className="text-[var(--accent)] font-semibold">
                        {subject.name} ({subject.code})
                      </span>
                    )}
                    {ev.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {ev.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 self-end sm:self-center">
                <button
                  onClick={() => {
                    setEditingEvent(ev);
                    setIsModalOpen(true);
                  }}
                  className="p-1.5 rounded vintage-btn-secondary"
                  title="Edit Event"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDuplicateEvent(ev)}
                  className="p-1.5 rounded vintage-btn-secondary"
                  title="Duplicate Event"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteEvent(ev.id, ev.title)}
                  className="p-1.5 rounded vintage-btn-secondary text-[var(--accent-red)] hover:border-[var(--accent-red)]"
                  title="Delete Event"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Title & Calendar Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--accent)] font-bold">
            Academic Routine & Timetable
          </span>
          <h1 className="text-2xl font-serif font-bold text-[var(--text-primary)]">
            Scheduler & Calendar
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Buttons */}
          <div className="flex rounded border border-[var(--border-color)] overflow-hidden font-mono text-xs">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 transition-colors ${
                viewMode === 'month' ? 'bg-[var(--text-primary)] text-[var(--bg-surface)] font-bold' : 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1.5 transition-colors ${
                viewMode === 'agenda' ? 'bg-[var(--text-primary)] text-[var(--bg-surface)] font-bold' : 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
              }`}
            >
              Agenda
            </button>
          </div>

          <button
            onClick={() => {
              setEditingEvent({
                date: new Date().toISOString().split('T')[0],
                startTime: '09:00',
                endTime: '10:00',
                category: 'study',
                priority: 'medium'
              });
              setIsModalOpen(true);
            }}
            className="px-3 py-1.5 rounded vintage-btn-primary flex items-center gap-1.5 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Date Navigation & Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-surface)] p-3 rounded border border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <button onClick={handlePrev} className="p-1.5 rounded vintage-btn-secondary" title="Previous Month">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={handleToday} className="px-2.5 py-1 text-xs font-mono rounded vintage-btn-secondary">
            Today
          </button>
          <button onClick={handleNext} className="p-1.5 rounded vintage-btn-secondary" title="Next Month">
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="font-serif font-bold text-base text-[var(--text-primary)] ml-2">
            {currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="p-1.5 rounded vintage-input"
          >
            <option value="all">All Categories</option>
            <option value="study">Study</option>
            <option value="college">College</option>
            <option value="assignment">Assignment</option>
            <option value="examination">Examination</option>
            <option value="project">Project</option>
            <option value="personal">Personal</option>
            <option value="meeting">Meeting</option>
          </select>

          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="p-1.5 rounded vintage-input"
          >
            <option value="all">All Subjects</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'month' ? renderMonthView() : renderAgendaView()}

      {/* Create / Edit Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsModalOpen(false)} />
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-entry-title"
            className="relative w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border-color)] rounded shadow-2xl overflow-hidden z-10 flex flex-col"
          >
            <div className="p-3 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-surface-elevated)]">
              <h3 id="calendar-entry-title" className="font-serif font-bold text-sm text-[var(--text-primary)]">
                {editingEvent?.id ? 'Edit Calendar Event' : 'New Calendar Entry'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close modal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-4 space-y-3 overflow-y-auto max-h-[80vh]">
              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={editingEvent?.title || ''}
                  onChange={(e) => setEditingEvent(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Algorithms Lecture, Library Study Group"
                  className="w-full p-2 text-xs rounded vintage-input"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={editingEvent?.date || ''}
                    onChange={(e) => setEditingEvent(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full p-2 text-xs rounded vintage-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={editingEvent?.startTime || '09:00'}
                    onChange={(e) => setEditingEvent(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full p-2 text-xs rounded vintage-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={editingEvent?.endTime || '10:00'}
                    onChange={(e) => setEditingEvent(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full p-2 text-xs rounded vintage-input font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Category
                  </label>
                  <select
                    value={editingEvent?.category || 'study'}
                    onChange={(e) => setEditingEvent(prev => ({ ...prev, category: e.target.value as EventCategory }))}
                    className="w-full p-2 text-xs rounded vintage-input capitalize"
                  >
                    <option value="study">Study</option>
                    <option value="college">College</option>
                    <option value="assignment">Assignment</option>
                    <option value="examination">Examination</option>
                    <option value="project">Project</option>
                    <option value="personal">Personal</option>
                    <option value="meeting">Meeting</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Related Subject
                  </label>
                  <select
                    value={editingEvent?.subjectId || ''}
                    onChange={(e) => setEditingEvent(prev => ({ ...prev, subjectId: e.target.value }))}
                    className="w-full p-2 text-xs rounded vintage-input"
                  >
                    <option value="">(None)</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Location / Hall
                  </label>
                  <input
                    type="text"
                    value={editingEvent?.location || ''}
                    onChange={(e) => setEditingEvent(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g. Science Block 102"
                    className="w-full p-2 text-xs rounded vintage-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Recurrence
                  </label>
                  <select
                    value={editingEvent?.recurrence || 'none'}
                    onChange={(e) => setEditingEvent(prev => ({ ...prev, recurrence: e.target.value as EventRecurrence }))}
                    className="w-full p-2 text-xs rounded vintage-input capitalize"
                  >
                    <option value="none">One-time event</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="weekdays">Weekdays (Mon-Fri)</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Description / Notes
                </label>
                <textarea
                  rows={3}
                  value={editingEvent?.description || ''}
                  onChange={(e) => setEditingEvent(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Class preparation, reading assignments or objectives..."
                  className="w-full p-2 text-xs rounded vintage-input"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-2 border-t border-[var(--border-color)]">
                {editingEvent?.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (editingEvent?.id) {
                        handleDeleteEvent(editingEvent.id, editingEvent.title || 'Event');
                        setIsModalOpen(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded vintage-btn-secondary text-[var(--accent-red)] flex items-center gap-1.5 text-xs font-mono"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Event</span>
                  </button>
                ) : <div />}
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 rounded vintage-btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-1.5 rounded vintage-btn-primary">
                    Save Event
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
