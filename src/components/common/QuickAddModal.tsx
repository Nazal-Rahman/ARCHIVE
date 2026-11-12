import React, { useState } from 'react';
import {
  X,
  CheckSquare,
  Calendar,
  BookOpen,
  PenTool,
  BookmarkCheck,
  Upload
} from 'lucide-react';
import { useApp, type QuickAddType } from '../../context/AppContext';
import { db, logActivity } from '../../db/database';
import { useLiveQuery } from 'dexie-react-hooks';
import type { PriorityLevel, WorkCategory, EventCategory, LogCategory } from '../../db/types';

export const QuickAddModal: React.FC = () => {
  const { isQuickAddOpen, closeQuickAdd, quickAddType, addToast } = useApp();
  const [activeType, setActiveType] = useState<QuickAddType>(quickAddType || 'work');

  // Load existing subjects for dropdowns
  const subjects = useLiveQuery(() => db.subjects.where('isArchived').equals(0).toArray()) || [];

  // Form states
  // 1. Work / Task
  const [workTitle, setWorkTitle] = useState('');
  const [workDesc, setWorkDesc] = useState('');
  const [workSubject, setWorkSubject] = useState('');
  const [workCategory, setWorkCategory] = useState<WorkCategory>('assignment');
  const [workDueDate, setWorkDueDate] = useState(new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]);
  const [workPriority, setWorkPriority] = useState<PriorityLevel>('medium');

  // 2. Schedule Event
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventStart, setEventStart] = useState('09:00');
  const [eventEnd, setEventEnd] = useState('10:00');
  const [eventCategory, setEventCategory] = useState<EventCategory>('study');
  const [eventSubject, setEventSubject] = useState('');
  const [eventLocation, setEventLocation] = useState('');

  // 3. Subject
  const [subName, setSubName] = useState('');
  const [subCode, setSubCode] = useState('');
  const [subCredits, setSubCredits] = useState(3);
  const [subColor, setSubColor] = useState('#B66A3C');
  const [subDesc, setSubDesc] = useState('');

  // 4. Quick Note
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState<'quick' | 'subject' | 'journal' | 'study' | 'important'>('quick');

  // 5. Academic Log
  const [logTitle, setLogTitle] = useState('');
  const [logDesc, setLogDesc] = useState('');
  const [logCategory, setLogCategory] = useState<LogCategory>('lecture');
  const [logSubject, setLogSubject] = useState('');

  // 6. File Upload
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileDisplayName, setFileDisplayName] = useState('');
  const [fileSubject, setFileSubject] = useState('');

  if (!isQuickAddOpen) return null;

  const handleSaveWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workTitle.trim()) return;

    const id = 'work_' + Date.now();
    await db.collegeWork.add({
      id,
      title: workTitle.trim(),
      description: workDesc.trim(),
      subjectId: workSubject || (subjects[0]?.id || ''),
      category: workCategory,
      assignedDate: new Date().toISOString().split('T')[0],
      dueDate: workDueDate,
      priority: workPriority,
      status: 'not_started',
      attachmentIds: [],
      links: [],
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    await logActivity('created', 'work', workTitle.trim(), id);
    addToast(`Added: ${workTitle.trim()}`, 'success');
    closeQuickAdd();
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    const id = 'sched_' + Date.now();
    await db.schedules.add({
      id,
      title: eventTitle.trim(),
      description: eventDesc.trim(),
      date: eventDate,
      startTime: eventStart,
      endTime: eventEnd,
      category: eventCategory,
      priority: 'medium',
      subjectId: eventSubject || undefined,
      location: eventLocation.trim() || undefined,
      recurrence: 'none',
      isCompleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    await logActivity('created', 'event', eventTitle.trim(), id);
    addToast(`Scheduled: ${eventTitle.trim()}`, 'success');
    closeQuickAdd();
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim()) return;

    const id = 'sub_' + Date.now();
    await db.subjects.add({
      id,
      name: subName.trim(),
      code: subCode.trim().toUpperCase() || 'CRS-100',
      semester: 'Semester V',
      credits: subCredits,
      description: subDesc.trim(),
      color: subColor,
      tags: [],
      isArchived: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    await logActivity('created', 'subject', subName.trim(), id);
    addToast(`Created subject: ${subName.trim()}`, 'success');
    closeQuickAdd();
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;

    const id = 'note_' + Date.now();
    await db.notes.add({
      id,
      title: noteTitle.trim(),
      content: noteContent.trim(),
      category: noteCategory,
      tags: [],
      isFavorite: false,
      isPinned: false,
      attachmentIds: [],
      links: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    await logActivity('created', 'note', noteTitle.trim(), id);
    addToast(`Saved note: ${noteTitle.trim()}`, 'success');
    closeQuickAdd();
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTitle.trim()) return;

    const count = await db.academicLogs.count();
    const id = 'log_' + Date.now();
    await db.academicLogs.add({
      id,
      logNumber: count + 1,
      title: logTitle.trim(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      description: logDesc.trim(),
      category: logCategory,
      subjectId: logSubject || undefined,
      attachmentIds: [],
      links: [],
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    await logActivity('created', 'log', logTitle.trim(), id);
    addToast(`Recorded Log #${String(count + 1).padStart(3, '0')}`, 'success');
    closeQuickAdd();
  };

  const handleSaveFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFile) return;

    const id = 'file_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const extension = uploadedFile.name.split('.').pop()?.toLowerCase() || '';

    let cat: 'image' | 'document' | 'pdf' | 'presentation' | 'video' | 'audio' | 'archive' | 'other' = 'document';
    if (uploadedFile.type.startsWith('image/')) cat = 'image';
    else if (uploadedFile.type === 'application/pdf' || extension === 'pdf') cat = 'pdf';
    else if (['zip', 'rar', 'tar', 'gz', '7z'].includes(extension)) cat = 'archive';
    else if (['ppt', 'pptx'].includes(extension)) cat = 'presentation';
    else if (uploadedFile.type.startsWith('video/')) cat = 'video';
    else if (uploadedFile.type.startsWith('audio/')) cat = 'audio';

    await db.files.add({
      id,
      originalName: uploadedFile.name,
      displayName: fileDisplayName.trim() || uploadedFile.name,
      description: '',
      category: cat,
      uploadDate: Date.now(),
      fileSize: uploadedFile.size,
      fileType: extension,
      mimeType: uploadedFile.type,
      tags: [],
      subjectId: fileSubject || undefined,
      isFavorite: false,
      blob: uploadedFile,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    await logActivity('created', 'file', fileDisplayName.trim() || uploadedFile.name, id);
    addToast(`Uploaded: ${fileDisplayName.trim() || uploadedFile.name}`, 'success');
    closeQuickAdd();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={closeQuickAdd}
      />

      {/* Modal Dialog */}
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-add-title"
        className="relative w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border-color)] rounded shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-3 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-surface-elevated)]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
            <h3 id="quick-add-title" className="font-serif font-bold text-sm text-[var(--text-primary)]">
              Quick Archive Entry
            </h3>
          </div>
          <button
            onClick={closeQuickAdd}
            className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label="Close Quick Add"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[var(--border-color)] overflow-x-auto bg-[var(--bg-inset)]/30 text-xs font-mono">
          <button
            onClick={() => setActiveType('work')}
            className={`px-3 py-2 flex items-center gap-1.5 whitespace-nowrap transition-colors border-b-2 ${
              activeType === 'work'
                ? 'border-[var(--accent)] font-bold text-[var(--text-primary)] bg-[var(--bg-surface)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Task/Work</span>
          </button>
          <button
            onClick={() => setActiveType('event')}
            className={`px-3 py-2 flex items-center gap-1.5 whitespace-nowrap transition-colors border-b-2 ${
              activeType === 'event'
                ? 'border-[var(--accent)] font-bold text-[var(--text-primary)] bg-[var(--bg-surface)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Schedule</span>
          </button>
          <button
            onClick={() => setActiveType('note')}
            className={`px-3 py-2 flex items-center gap-1.5 whitespace-nowrap transition-colors border-b-2 ${
              activeType === 'note'
                ? 'border-[var(--accent)] font-bold text-[var(--text-primary)] bg-[var(--bg-surface)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Note</span>
          </button>
          <button
            onClick={() => setActiveType('log')}
            className={`px-3 py-2 flex items-center gap-1.5 whitespace-nowrap transition-colors border-b-2 ${
              activeType === 'log'
                ? 'border-[var(--accent)] font-bold text-[var(--text-primary)] bg-[var(--bg-surface)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <BookmarkCheck className="w-3.5 h-3.5" />
            <span>Log</span>
          </button>
          <button
            onClick={() => setActiveType('file')}
            className={`px-3 py-2 flex items-center gap-1.5 whitespace-nowrap transition-colors border-b-2 ${
              activeType === 'file'
                ? 'border-[var(--accent)] font-bold text-[var(--text-primary)] bg-[var(--bg-surface)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>File</span>
          </button>
          <button
            onClick={() => setActiveType('subject')}
            className={`px-3 py-2 flex items-center gap-1.5 whitespace-nowrap transition-colors border-b-2 ${
              activeType === 'subject'
                ? 'border-[var(--accent)] font-bold text-[var(--text-primary)] bg-[var(--bg-surface)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Subject</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 overflow-y-auto flex-1">
          {activeType === 'work' && (
            <form onSubmit={handleSaveWork} className="space-y-3">
              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Task / Assignment Title *
                </label>
                <input
                  type="text"
                  required
                  value={workTitle}
                  onChange={(e) => setWorkTitle(e.target.value)}
                  placeholder="e.g. Lab Exercise 4, Essay draft, Seminar slides"
                  className="w-full p-2 text-xs rounded vintage-input"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Related Subject
                  </label>
                  <select
                    value={workSubject}
                    onChange={(e) => setWorkSubject(e.target.value)}
                    className="w-full p-2 text-xs rounded vintage-input"
                  >
                    <option value="">(No specific subject)</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Category
                  </label>
                  <select
                    value={workCategory}
                    onChange={(e) => setWorkCategory(e.target.value as WorkCategory)}
                    className="w-full p-2 text-xs rounded vintage-input capitalize"
                  >
                    <option value="assignment">Assignment</option>
                    <option value="lab_record">Lab Record</option>
                    <option value="project">Project</option>
                    <option value="seminar">Seminar</option>
                    <option value="presentation">Presentation</option>
                    <option value="report">Report</option>
                    <option value="examination">Examination</option>
                    <option value="workshop">Workshop</option>
                    <option value="college_activity">College Activity</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Submission Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={workDueDate}
                    onChange={(e) => setWorkDueDate(e.target.value)}
                    className="w-full p-2 text-xs rounded vintage-input font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Priority Level
                  </label>
                  <select
                    value={workPriority}
                    onChange={(e) => setWorkPriority(e.target.value as PriorityLevel)}
                    className="w-full p-2 text-xs rounded vintage-input"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Description / Instructions
                </label>
                <textarea
                  rows={3}
                  value={workDesc}
                  onChange={(e) => setWorkDesc(e.target.value)}
                  placeholder="Submission criteria, questions or notes..."
                  className="w-full p-2 text-xs rounded vintage-input"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={closeQuickAdd} className="px-3 py-1.5 rounded vintage-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded vintage-btn-primary">
                  Save Work Item
                </button>
              </div>
            </form>
          )}

          {activeType === 'event' && (
            <form onSubmit={handleSaveEvent} className="space-y-3">
              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Event / Session Title *
                </label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. Physics Lecture, Algorithms Problem Session"
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
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
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
                    value={eventStart}
                    onChange={(e) => setEventStart(e.target.value)}
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
                    value={eventEnd}
                    onChange={(e) => setEventEnd(e.target.value)}
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
                    value={eventCategory}
                    onChange={(e) => setEventCategory(e.target.value as EventCategory)}
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
                    Location / Room
                  </label>
                  <input
                    type="text"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    placeholder="e.g. Hall 301, Central Library"
                    className="w-full p-2 text-xs rounded vintage-input"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={closeQuickAdd} className="px-3 py-1.5 rounded vintage-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded vintage-btn-primary">
                  Save Event
                </button>
              </div>
            </form>
          )}

          {activeType === 'note' && (
            <form onSubmit={handleSaveNote} className="space-y-3">
              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Note Title *
                </label>
                <input
                  type="text"
                  required
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="e.g. Theorem Notes, Important Reminder"
                  className="w-full p-2 text-xs rounded vintage-input"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Category
                </label>
                <select
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value as 'quick' | 'subject' | 'journal' | 'study' | 'important')}
                  className="w-full p-2 text-xs rounded vintage-input capitalize"
                >
                  <option value="quick">Quick Note</option>
                  <option value="study">Study Notes</option>
                  <option value="journal">Personal Journal</option>
                  <option value="subject">Subject Notes</option>
                  <option value="important">Important</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Parchment Content (Markdown supported)
                </label>
                <textarea
                  rows={5}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Write your notes, thoughts or research highlights..."
                  className="w-full p-2 text-xs rounded vintage-input font-body"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={closeQuickAdd} className="px-3 py-1.5 rounded vintage-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded vintage-btn-primary">
                  Save Note
                </button>
              </div>
            </form>
          )}

          {activeType === 'log' && (
            <form onSubmit={handleSaveLog} className="space-y-3">
              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Academic Log Title *
                </label>
                <input
                  type="text"
                  required
                  value={logTitle}
                  onChange={(e) => setLogTitle(e.target.value)}
                  placeholder="e.g. Lab Experiment 3 Observations, Lecture Summary"
                  className="w-full p-2 text-xs rounded vintage-input"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Category
                  </label>
                  <select
                    value={logCategory}
                    onChange={(e) => setLogCategory(e.target.value as LogCategory)}
                    className="w-full p-2 text-xs rounded vintage-input capitalize"
                  >
                    <option value="lecture">Lecture</option>
                    <option value="experiment">Experiment</option>
                    <option value="assignment_progress">Assignment Progress</option>
                    <option value="project_milestone">Project Milestone</option>
                    <option value="seminar">Seminar</option>
                    <option value="exam_prep">Exam Prep</option>
                    <option value="field_work">Field Work</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Related Subject
                  </label>
                  <select
                    value={logSubject}
                    onChange={(e) => setLogSubject(e.target.value)}
                    className="w-full p-2 text-xs rounded vintage-input"
                  >
                    <option value="">(No specific subject)</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Log Record Details
                </label>
                <textarea
                  rows={4}
                  value={logDesc}
                  onChange={(e) => setLogDesc(e.target.value)}
                  placeholder="Describe your experimental procedures, readings, or discussion..."
                  className="w-full p-2 text-xs rounded vintage-input"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={closeQuickAdd} className="px-3 py-1.5 rounded vintage-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded vintage-btn-primary">
                  Record Log
                </button>
              </div>
            </form>
          )}

          {activeType === 'file' && (
            <form onSubmit={handleSaveFile} className="space-y-3">
              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Select Local File *
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setUploadedFile(f);
                      if (!fileDisplayName) setFileDisplayName(f.name);
                    }
                  }}
                  className="w-full text-xs font-mono file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-mono file:bg-[var(--text-primary)] file:text-[var(--bg-surface)] hover:file:bg-[var(--accent)]"
                />
                <p className="text-[10px] text-[var(--text-secondary)] mt-1 font-mono">
                  Stored directly as a binary Blob in your device&apos;s IndexedDB.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Display Title
                </label>
                <input
                  type="text"
                  value={fileDisplayName}
                  onChange={(e) => setFileDisplayName(e.target.value)}
                  placeholder="Custom name for your library"
                  className="w-full p-2 text-xs rounded vintage-input"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Related Subject
                </label>
                <select
                  value={fileSubject}
                  onChange={(e) => setFileSubject(e.target.value)}
                  className="w-full p-2 text-xs rounded vintage-input"
                >
                  <option value="">(No specific subject)</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={closeQuickAdd} className="px-3 py-1.5 rounded vintage-btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={!uploadedFile} className="px-4 py-1.5 rounded vintage-btn-primary">
                  Store to Archive
                </button>
              </div>
            </form>
          )}

          {activeType === 'subject' && (
            <form onSubmit={handleSaveSubject} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Subject Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={subName}
                    onChange={(e) => setSubName(e.target.value)}
                    placeholder="e.g. Computer Networks"
                    className="w-full p-2 text-xs rounded vintage-input"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Code
                  </label>
                  <input
                    type="text"
                    value={subCode}
                    onChange={(e) => setSubCode(e.target.value)}
                    placeholder="CS-302"
                    className="w-full p-2 text-xs rounded vintage-input font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Credits
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={subCredits}
                    onChange={(e) => setSubCredits(Number(e.target.value))}
                    className="w-full p-2 text-xs rounded vintage-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={subColor}
                      onChange={(e) => setSubColor(e.target.value)}
                      className="w-8 h-8 rounded border border-[var(--border-color)] p-0.5 cursor-pointer bg-transparent"
                    />
                    <span className="font-mono text-xs">{subColor}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Description / Objectives
                </label>
                <textarea
                  rows={3}
                  value={subDesc}
                  onChange={(e) => setSubDesc(e.target.value)}
                  placeholder="Course scope, prerequisites or goals..."
                  className="w-full p-2 text-xs rounded vintage-input"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={closeQuickAdd} className="px-3 py-1.5 rounded vintage-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded vintage-btn-primary">
                  Create Subject
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
