import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Archive,
  Search,
  Edit2,
  Trash2,
  ArrowRight,
  ExternalLink,
  RotateCcw,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, logActivity } from '../../db/database';
import { SubjectWorkspace } from './SubjectWorkspace';
import type { Subject } from '../../db/types';

export const Subjects: React.FC = () => {
  const { selectedSubjectId, setSelectedSubjectId, addToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Partial<Subject> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Queries
  const allSubjects = useLiveQuery(() => db.subjects.toArray()) || [];
  const allModules = useLiveQuery(() => db.modules.toArray()) || [];

  if (selectedSubjectId) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <SubjectWorkspace
          subjectId={selectedSubjectId}
          onBack={() => setSelectedSubjectId(null)}
        />
      </div>
    );
  }

  // Filter subjects
  const filtered = allSubjects.filter(s => {
    if (showArchived ? !s.isArchived : s.isArchived) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate subject progress
  const getSubjectProgress = (subjectId: string) => {
    const subModules = allModules.filter(m => m.subjectId === subjectId);
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

  // Toggle Archive
  const handleToggleArchive = async (subject: Subject) => {
    const updated = !subject.isArchived;
    await db.subjects.update(subject.id, {
      isArchived: updated,
      updatedAt: Date.now()
    });
    addToast(updated ? 'Subject moved to archives' : 'Subject restored to active curriculum', 'info');
  };

  // Delete Subject safely
  const handleDeleteSubject = async (subject: Subject) => {
    if (window.confirm(`Permanently delete subject "${subject.name}"? This will not delete independent notes or files.`)) {
      await db.subjects.delete(subject.id);
      await logActivity('deleted', 'subject', subject.name, subject.id);
      addToast('Subject deleted', 'info');
    }
  };

  // Save Subject
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject?.name?.trim()) return;

    if (editingSubject.id) {
      await db.subjects.update(editingSubject.id, {
        name: editingSubject.name.trim(),
        code: editingSubject.code?.trim().toUpperCase() || 'CRS-100',
        semester: editingSubject.semester || 'Semester V',
        credits: editingSubject.credits || 3,
        description: editingSubject.description?.trim() || '',
        color: editingSubject.color || '#B66A3C',
        instructor: editingSubject.instructor,
        updatedAt: Date.now()
      });
      await logActivity('updated', 'subject', editingSubject.name.trim(), editingSubject.id);
      addToast('Subject updated', 'success');
    } else {
      const id = 'sub_' + Date.now();
      await db.subjects.add({
        id,
        name: editingSubject.name.trim(),
        code: editingSubject.code?.trim().toUpperCase() || 'CRS-100',
        semester: editingSubject.semester || 'Semester V',
        credits: editingSubject.credits || 3,
        description: editingSubject.description?.trim() || '',
        color: editingSubject.color || '#B66A3C',
        instructor: editingSubject.instructor,
        syllabus: '',
        tags: [],
        isArchived: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      await logActivity('created', 'subject', editingSubject.name.trim(), id);
      addToast('Created new subject', 'success');
    }

    setIsModalOpen(false);
    setEditingSubject(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--accent)] font-bold">
            Curriculum & Academic Subjects
          </span>
          <h1 className="text-2xl font-serif font-bold text-[var(--text-primary)]">
            Academic Subject Manager
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-1.5 rounded vintage-btn-secondary text-xs flex items-center gap-1.5 font-mono ${
              showArchived ? 'border-[var(--accent)] text-[var(--accent)]' : ''
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{showArchived ? 'View Active Subjects' : 'Archived Courses'}</span>
          </button>

          <button
            onClick={() => {
              setEditingSubject({
                semester: 'Semester V',
                credits: 3,
                color: '#B66A3C'
              });
              setIsModalOpen(true);
            }}
            className="px-3 py-1.5 rounded vintage-btn-primary flex items-center gap-1.5 text-xs font-mono"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Subject</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="vintage-card rounded p-3 flex items-center gap-3">
        <Search className="w-4 h-4 text-[var(--accent)] shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter courses by name, code or description..."
          className="w-full bg-transparent border-none text-xs font-body text-[var(--text-primary)] focus:outline-none placeholder-[var(--text-secondary)]"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="p-1 text-[var(--text-secondary)]">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Grid of Subjects */}
      {filtered.length === 0 ? (
        <div className="vintage-card rounded p-12 text-center text-[var(--text-secondary)]">
          <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40 text-[var(--accent)]" />
          <h3 className="font-serif text-base font-bold text-[var(--text-primary)]">
            {showArchived ? 'No archived subjects found' : 'No academic subjects found'}
          </h3>
          <p className="text-xs font-mono mt-1">
            {showArchived ? 'Completed courses will appear here.' : 'Create a course to begin tracking modules and topics.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(sub => {
            const progress = getSubjectProgress(sub.id);
            const subModules = allModules.filter(m => m.subjectId === sub.id);

            return (
              <div
                key={sub.id}
                className="vintage-card vintage-card-hover rounded overflow-hidden flex flex-col justify-between border-t-4 transition-all"
                style={{ borderTopColor: sub.color || '#B66A3C' }}
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[var(--bg-inset)] border border-[var(--border-color)] text-[var(--accent)]">
                      {sub.code}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                      {sub.semester} • {sub.credits} cr
                    </span>
                  </div>

                  <div>
                    <h3
                      onClick={() => setSelectedSubjectId(sub.id)}
                      className="font-serif font-bold text-lg text-[var(--text-primary)] hover:text-[var(--accent)] cursor-pointer tracking-tight"
                    >
                      {sub.name}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] font-body line-clamp-2 mt-1">
                      {sub.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                      <span className="text-[var(--text-secondary)]">Syllabus Progress</span>
                      <span className="font-bold text-[var(--accent)]">{progress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[var(--bg-inset)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${progress}%`, backgroundColor: sub.color || '#B66A3C' }}
                      />
                    </div>
                  </div>

                  {sub.instructor?.name && (
                    <div className="text-[11px] text-[var(--text-secondary)] font-body pt-1">
                      Instructor: <span className="text-[var(--text-primary)] font-semibold">{sub.instructor.name}</span>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="p-3 bg-[var(--bg-inset)]/30 border-t border-[var(--border-color)] flex items-center justify-between">
                  <button
                    onClick={() => setSelectedSubjectId(sub.id)}
                    className="text-xs font-mono font-bold text-[var(--accent)] hover:underline flex items-center gap-1"
                  >
                    <span>Open Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingSubject(sub);
                        setIsModalOpen(true);
                      }}
                      className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded"
                      title="Edit Subject"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleArchive(sub)}
                      className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded"
                      title={sub.isArchived ? 'Restore to active' : 'Archive subject'}
                    >
                      {sub.isArchived ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDeleteSubject(sub)}
                      className="p-1 text-[var(--text-secondary)] hover:text-[var(--accent-red)] rounded"
                      title="Delete Subject"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Subject Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsModalOpen(false)} />
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="subject-modal-title"
            className="relative w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border-color)] rounded shadow-2xl overflow-hidden z-10 flex flex-col"
          >
            <div className="p-3 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-surface-elevated)]">
              <h3 id="subject-modal-title" className="font-serif font-bold text-sm text-[var(--text-primary)]">
                {editingSubject?.id ? 'Edit Subject Details' : 'Create Academic Subject'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close modal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-4 space-y-3 overflow-y-auto max-h-[80vh]">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Subject Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingSubject?.name || ''}
                    onChange={(e) => setEditingSubject(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Distributed Computing"
                    className="w-full p-2 text-xs rounded vintage-input"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Course Code
                  </label>
                  <input
                    type="text"
                    value={editingSubject?.code || ''}
                    onChange={(e) => setEditingSubject(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="CS-401"
                    className="w-full p-2 text-xs rounded vintage-input font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Semester
                  </label>
                  <input
                    type="text"
                    value={editingSubject?.semester || 'Semester V'}
                    onChange={(e) => setEditingSubject(prev => ({ ...prev, semester: e.target.value }))}
                    className="w-full p-2 text-xs rounded vintage-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Credits
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={editingSubject?.credits || 3}
                    onChange={(e) => setEditingSubject(prev => ({ ...prev, credits: Number(e.target.value) }))}
                    className="w-full p-2 text-xs rounded vintage-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Subject Color
                  </label>
                  <input
                    type="color"
                    value={editingSubject?.color || '#B66A3C'}
                    onChange={(e) => setEditingSubject(prev => ({ ...prev, color: e.target.value }))}
                    className="w-full h-8 rounded border border-[var(--border-color)] cursor-pointer p-0.5 bg-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editingSubject?.description || ''}
                  onChange={(e) => setEditingSubject(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Subject scope, focus areas or goals..."
                  className="w-full p-2 text-xs rounded vintage-input"
                />
              </div>

              {/* Instructor Section */}
              <div className="pt-2 border-t border-[var(--border-color)]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--accent)] font-bold block mb-2">
                  Instructor Information (Optional)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-[var(--text-secondary)] mb-0.5">Instructor Name</label>
                    <input
                      type="text"
                      value={editingSubject?.instructor?.name || ''}
                      onChange={(e) => setEditingSubject(prev => ({
                        ...prev,
                        instructor: { ...prev?.instructor, name: e.target.value }
                      }))}
                      placeholder="Prof. Name"
                      className="w-full p-1.5 text-xs rounded vintage-input"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-[var(--text-secondary)] mb-0.5">Email</label>
                    <input
                      type="email"
                      value={editingSubject?.instructor?.email || ''}
                      onChange={(e) => setEditingSubject(prev => ({
                        ...prev,
                        instructor: { ...prev?.instructor, name: prev?.instructor?.name || '', email: e.target.value }
                      }))}
                      placeholder="prof@university.edu"
                      className="w-full p-1.5 text-xs rounded vintage-input font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[var(--border-color)]">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 rounded vintage-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded vintage-btn-primary">
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
