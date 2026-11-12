import React, { useState } from 'react';
import {
  BookmarkCheck,
  Plus,
  Search,
  Calendar,
  Clock,
  Tag,
  Paperclip,
  ExternalLink,
  Edit2,
  Trash2,
  Filter,
  Grid,
  List as ListIcon,
  Printer,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, logActivity } from '../../db/database';
import type { AcademicLog, LogCategory, LinkItem } from '../../db/types';

export const Logbook: React.FC = () => {
  const { addToast } = useApp();

  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  const [editingLog, setEditingLog] = useState<Partial<AcademicLog> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [linkInputTitle, setLinkInputTitle] = useState('');
  const [linkInputUrl, setLinkInputUrl] = useState('');
  const [tagInput, setTagInput] = useState('');

  // Queries
  const logs = useLiveQuery(() => db.academicLogs.orderBy('logNumber').reverse().toArray()) || [];
  const subjects = useLiveQuery(() => db.subjects.where('isArchived').equals(0).toArray()) || [];
  const files = useLiveQuery(() => db.files.toArray()) || [];

  // Filtering
  const filteredLogs = logs.filter(l => {
    if (categoryFilter !== 'all' && l.category !== categoryFilter) return false;
    if (subjectFilter !== 'all' && l.subjectId !== subjectFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        l.title.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        (l.personalRemarks && l.personalRemarks.toLowerCase().includes(q)) ||
        l.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Delete Log
  const handleDeleteLog = async (id: string, logNum: number, title: string) => {
    if (window.confirm(`Delete Log #${String(logNum).padStart(3, '0')}: "${title}"?`)) {
      await db.academicLogs.delete(id);
      await logActivity('deleted', 'log', title, id);
      addToast('Academic log removed', 'info');
    }
  };

  // Add Link to editing log
  const handleAddLinkToLog = () => {
    if (!linkInputTitle.trim() || !linkInputUrl.trim()) return;
    const currentLinks = editingLog?.links || [];
    setEditingLog(prev => ({
      ...prev,
      links: [...currentLinks, { title: linkInputTitle.trim(), url: linkInputUrl.trim() }]
    }));
    setLinkInputTitle('');
    setLinkInputUrl('');
  };

  // Remove Link
  const handleRemoveLink = (index: number) => {
    const currentLinks = editingLog?.links || [];
    setEditingLog(prev => ({
      ...prev,
      links: currentLinks.filter((_, idx) => idx !== index)
    }));
  };

  // Save Log
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog?.title?.trim()) return;

    const tagsArray = tagInput ? tagInput.split(',').map(t => t.trim()).filter(Boolean) : (editingLog.tags || []);

    if (editingLog.id) {
      await db.academicLogs.update(editingLog.id, {
        title: editingLog.title.trim(),
        description: editingLog.description?.trim() || '',
        category: (editingLog.category || 'lecture') as LogCategory,
        subjectId: editingLog.subjectId || undefined,
        personalRemarks: editingLog.personalRemarks?.trim() || undefined,
        links: editingLog.links || [],
        tags: tagsArray,
        updatedAt: Date.now()
      });
      await logActivity('updated', 'log', editingLog.title.trim(), editingLog.id);
      addToast('Academic log entry updated', 'success');
    } else {
      const count = await db.academicLogs.count();
      const id = 'log_' + Date.now();
      const newLogNumber = count + 1;

      await db.academicLogs.add({
        id,
        logNumber: newLogNumber,
        title: editingLog.title.trim(),
        date: editingLog.date || new Date().toISOString().split('T')[0],
        time: editingLog.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        description: editingLog.description?.trim() || '',
        category: (editingLog.category || 'lecture') as LogCategory,
        subjectId: editingLog.subjectId || undefined,
        attachmentIds: [],
        links: editingLog.links || [],
        tags: tagsArray,
        personalRemarks: editingLog.personalRemarks?.trim() || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      await logActivity('created', 'log', editingLog.title.trim(), id);
      addToast(`Recorded Log #${String(newLogNumber).padStart(3, '0')}`, 'success');
    }

    setIsModalOpen(false);
    setEditingLog(null);
    setTagInput('');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--accent)] font-bold">
            Formal Academic Journal & Experiment Ledger
          </span>
          <h1 className="text-2xl font-serif font-bold text-[var(--text-primary)]">
            Academic Logbook
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggles */}
          <div className="flex rounded border border-[var(--border-color)] overflow-hidden font-mono text-xs">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 flex items-center gap-1 ${
                viewMode === 'timeline' ? 'bg-[var(--text-primary)] text-[var(--bg-surface)] font-bold' : 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>Timeline</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 flex items-center gap-1 ${
                viewMode === 'grid' ? 'bg-[var(--text-primary)] text-[var(--bg-surface)] font-bold' : 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="p-1.5 rounded vintage-btn-secondary"
            title="Print Academic Ledger"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setEditingLog({
                category: 'lecture',
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                links: [],
                tags: []
              });
              setTagInput('');
              setIsModalOpen(true);
            }}
            className="px-3 py-1.5 rounded vintage-btn-primary flex items-center gap-1.5 text-xs font-mono"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Academic Log</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="vintage-card rounded p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-[var(--accent)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search log titles, procedures, observations, tags..."
            className="w-full bg-transparent border-none text-xs text-[var(--text-primary)] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="p-1.5 rounded vintage-input capitalize"
          >
            <option value="all">All Log Types</option>
            <option value="experiment">Experiment</option>
            <option value="lecture">Lecture</option>
            <option value="assignment_progress">Assignment Progress</option>
            <option value="project_milestone">Project Milestone</option>
            <option value="seminar">Seminar</option>
            <option value="exam_prep">Exam Prep</option>
            <option value="field_work">Field Work</option>
            <option value="other">Other</option>
          </select>

          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="p-1.5 rounded vintage-input"
          >
            <option value="all">All Subjects</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Collection */}
      {filteredLogs.length === 0 ? (
        <div className="vintage-card rounded p-12 text-center text-[var(--text-secondary)]">
          <BookmarkCheck className="w-10 h-10 mx-auto mb-2 opacity-40 text-[var(--accent)]" />
          <h3 className="font-serif text-base font-bold text-[var(--text-primary)]">
            No academic logs recorded
          </h3>
          <p className="text-xs font-mono mt-1">
            Maintain high-fidelity documentation of laboratory findings, seminar takeaways, and thesis progress.
          </p>
        </div>
      ) : viewMode === 'timeline' ? (
        /* Timeline View */
        <div className="space-y-6 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-[var(--border-color)]">
          {filteredLogs.map(log => {
            const subject = subjects.find(s => s.id === log.subjectId);

            return (
              <div key={log.id} className="relative pl-12">
                {/* Stamp Circle Node on timeline */}
                <div className="absolute left-2.5 top-3 w-5 h-5 rounded-full bg-[var(--text-primary)] text-[var(--bg-surface)] flex items-center justify-center font-mono text-[9px] font-bold border-2 border-[var(--bg-surface)]">
                  {log.logNumber}
                </div>

                <div className="vintage-card rounded p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-color)] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[var(--text-primary)] text-[var(--bg-surface)]">
                          LOG #{String(log.logNumber).padStart(3, '0')}
                        </span>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--bg-inset)] border border-[var(--border-color)] text-[var(--accent)] font-semibold">
                          {log.category.replace('_', ' ')}
                        </span>
                        {subject && (
                          <span className="text-xs font-mono text-[var(--text-secondary)]">
                            • {subject.name} ({subject.code})
                          </span>
                        )}
                      </div>
                      <h3 className="font-serif font-bold text-lg text-[var(--text-primary)] mt-1.5">
                        {log.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono text-[var(--text-secondary)]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                        {log.date}
                      </span>
                      {log.time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
                          {log.time}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body description */}
                  <p className="text-xs font-body leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap">
                    {log.description}
                  </p>

                  {/* Personal Reflections / Remarks */}
                  {log.personalRemarks && (
                    <div className="p-3 rounded bg-[var(--bg-inset)]/40 border border-[var(--border-color)] text-xs font-body text-[var(--text-primary)]">
                      <span className="font-mono text-[10px] uppercase font-bold text-[var(--accent)] block mb-1">
                        Reflections & Key Takeaway:
                      </span>
                      {log.personalRemarks}
                    </div>
                  )}

                  {/* Links */}
                  {log.links && log.links.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {log.links.map((lnk, idx) => (
                        <a
                          key={idx}
                          href={lnk.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--accent)] hover:underline px-2 py-1 rounded bg-[var(--bg-inset)]/50 border border-[var(--border-color)]"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>{lnk.title}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Tags & Action Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
                    <div className="flex flex-wrap gap-1">
                      {log.tags.map((t, idx) => (
                        <span key={idx} className="vintage-tag">
                          #{t}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingLog(log);
                          setTagInput(log.tags.join(', '));
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 rounded vintage-btn-secondary"
                        title="Edit Log"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteLog(log.id, log.logNumber, log.title)}
                        className="p-1.5 rounded vintage-btn-secondary text-[var(--accent-red)]"
                        title="Delete Log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLogs.map(log => (
            <div key={log.id} className="vintage-card rounded p-4 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)] mb-1">
                  <span className="font-bold text-[var(--accent)]">LOG #{String(log.logNumber).padStart(3, '0')}</span>
                  <span>{log.date}</span>
                </div>
                <h3 className="font-serif font-bold text-base text-[var(--text-primary)]">
                  {log.title}
                </h3>
                <p className="text-xs font-body text-[var(--text-secondary)] line-clamp-3 mt-1">
                  {log.description}
                </p>
              </div>

              <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase px-1.5 rounded bg-[var(--bg-inset)]">
                  {log.category.replace('_', ' ')}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditingLog(log);
                      setTagInput(log.tags.join(', '));
                      setIsModalOpen(true);
                    }}
                    className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteLog(log.id, log.logNumber, log.title)}
                    className="p-1 text-[var(--text-secondary)] hover:text-[var(--accent-red)]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Log Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsModalOpen(false)} />
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="log-modal-title"
            className="relative w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border-color)] rounded shadow-2xl overflow-hidden z-10 flex flex-col"
          >
            <div className="p-3 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-surface-elevated)]">
              <h3 id="log-modal-title" className="font-serif font-bold text-sm text-[var(--text-primary)]">
                {editingLog?.id ? `Edit Academic Log #${String(editingLog.logNumber).padStart(3, '0')}` : 'Record New Academic Log'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close modal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-4 space-y-3 overflow-y-auto max-h-[80vh]">
              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Log Entry Title *
                </label>
                <input
                  type="text"
                  required
                  value={editingLog?.title || ''}
                  onChange={(e) => setEditingLog(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Synthesis of Results & Benchmark Observations"
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
                    value={editingLog?.date || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setEditingLog(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full p-2 text-xs rounded vintage-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={editingLog?.time || '12:00'}
                    onChange={(e) => setEditingLog(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full p-2 text-xs rounded vintage-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Category
                  </label>
                  <select
                    value={editingLog?.category || 'lecture'}
                    onChange={(e) => setEditingLog(prev => ({ ...prev, category: e.target.value as LogCategory }))}
                    className="w-full p-2 text-xs rounded vintage-input capitalize"
                  >
                    <option value="experiment">Experiment</option>
                    <option value="lecture">Lecture</option>
                    <option value="assignment_progress">Assignment Progress</option>
                    <option value="project_milestone">Project Milestone</option>
                    <option value="seminar">Seminar</option>
                    <option value="exam_prep">Exam Prep</option>
                    <option value="field_work">Field Work</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Related Subject
                </label>
                <select
                  value={editingLog?.subjectId || ''}
                  onChange={(e) => setEditingLog(prev => ({ ...prev, subjectId: e.target.value }))}
                  className="w-full p-2 text-xs rounded vintage-input"
                >
                  <option value="">(None)</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Procedure & Empirical Findings *
                </label>
                <textarea
                  rows={4}
                  required
                  value={editingLog?.description || ''}
                  onChange={(e) => setEditingLog(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Record step-by-step procedures, apparatus setup, observations..."
                  className="w-full p-2 text-xs rounded vintage-input font-body"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Personal Remarks / Deductions
                </label>
                <textarea
                  rows={2}
                  value={editingLog?.personalRemarks || ''}
                  onChange={(e) => setEditingLog(prev => ({ ...prev, personalRemarks: e.target.value }))}
                  placeholder="Critical reflections, anomalies, or follow-up notes..."
                  className="w-full p-2 text-xs rounded vintage-input font-body"
                />
              </div>

              {/* Reference Links within Log */}
              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Website / DOI Reference Links
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={linkInputTitle}
                    onChange={(e) => setLinkInputTitle(e.target.value)}
                    placeholder="Link Title (e.g. ACM Paper)"
                    className="flex-1 p-1.5 text-xs rounded vintage-input"
                  />
                  <input
                    type="url"
                    value={linkInputUrl}
                    onChange={(e) => setLinkInputUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 p-1.5 text-xs rounded vintage-input font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddLinkToLog}
                    className="px-2.5 py-1 rounded vintage-btn-secondary text-xs"
                  >
                    Add
                  </button>
                </div>

                {editingLog?.links && editingLog.links.length > 0 && (
                  <div className="space-y-1">
                    {editingLog.links.map((lnk, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] p-1.5 rounded bg-[var(--bg-inset)]/30 font-mono">
                        <span className="truncate">{lnk.title} ({lnk.url})</span>
                        <button type="button" onClick={() => handleRemoveLink(idx)} className="text-[var(--accent-red)]">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Experiment, Cache, Thesis, Proof"
                  className="w-full p-2 text-xs rounded vintage-input"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[var(--border-color)]">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 rounded vintage-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded vintage-btn-primary">
                  Save Academic Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
