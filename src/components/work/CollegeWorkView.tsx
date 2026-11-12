import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Calendar,
  AlertCircle,
  Paperclip,
  Clock,
  ArrowRight,
  Trash2,
  Edit2,
  Archive,
  ExternalLink,
  Kanban,
  List as ListIcon,
  X,
  Upload
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, logActivity } from '../../db/database';
import confetti from 'canvas-confetti';
import type { CollegeWork, WorkCategory, WorkStatus, PriorityLevel, FileItem } from '../../db/types';

export const CollegeWorkView: React.FC = () => {
  const { selectedWorkId, setSelectedWorkId, addToast } = useApp();

  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'deadlines' | 'archive'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const [editingItem, setEditingItem] = useState<Partial<CollegeWork> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  // Queries
  const allWork = useLiveQuery(() => db.collegeWork.toArray()) || [];
  const subjects = useLiveQuery(() => db.subjects.where('isArchived').equals(0).toArray()) || [];
  const allFiles = useLiveQuery(() => db.files.toArray()) || [];

  const todayStr = new Date().toISOString().split('T')[0];

  // Filtering
  const filtered = allWork.filter(item => {
    if (viewMode === 'archive') {
      if (item.status !== 'archived') return false;
    } else {
      if (item.status === 'archived') return false;
    }

    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    if (subjectFilter !== 'all' && item.subjectId !== subjectFilter) return false;
    if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Change Status
  const handleStatusChange = async (item: CollegeWork, newStatus: WorkStatus) => {
    await db.collegeWork.update(item.id, {
      status: newStatus,
      completedAt: newStatus === 'completed' || newStatus === 'submitted' ? Date.now() : undefined,
      updatedAt: Date.now()
    });

    if (newStatus === 'completed' || newStatus === 'submitted') {
      confetti({ particleCount: 35, spread: 55, origin: { y: 0.75 } });
      addToast(`Marked as ${newStatus.replace('_', ' ')}!`, 'success');
    }
  };

  // Delete Work
  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Delete work item "${title}"?`)) {
      await db.collegeWork.delete(id);
      await logActivity('deleted', 'work', title, id);
      addToast('Work item deleted', 'info');
    }
  };

  // Save Modal
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.title?.trim()) return;

    let attachmentIds = editingItem.attachmentIds || [];

    // If a new attachment is uploaded in the modal
    if (attachmentFile) {
      const fileId = 'file_' + Date.now();
      const ext = attachmentFile.name.split('.').pop()?.toLowerCase() || '';
      await db.files.add({
        id: fileId,
        originalName: attachmentFile.name,
        displayName: attachmentFile.name,
        category: attachmentFile.type.startsWith('image/') ? 'image' : ext === 'pdf' ? 'pdf' : 'document',
        uploadDate: Date.now(),
        fileSize: attachmentFile.size,
        fileType: ext,
        mimeType: attachmentFile.type,
        tags: ['Attachment', 'Work'],
        subjectId: editingItem.subjectId,
        relatedWorkId: editingItem.id,
        isFavorite: false,
        blob: attachmentFile,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      attachmentIds = [...attachmentIds, fileId];
    }

    if (editingItem.id) {
      await db.collegeWork.update(editingItem.id, {
        title: editingItem.title.trim(),
        description: editingItem.description?.trim() || '',
        subjectId: editingItem.subjectId || subjects[0]?.id || '',
        category: (editingItem.category || 'assignment') as WorkCategory,
        dueDate: editingItem.dueDate || todayStr,
        priority: (editingItem.priority || 'medium') as PriorityLevel,
        status: (editingItem.status || 'not_started') as WorkStatus,
        remarks: editingItem.remarks?.trim() || '',
        attachmentIds,
        updatedAt: Date.now()
      });
      await logActivity('updated', 'work', editingItem.title.trim(), editingItem.id);
      addToast('Academic work updated', 'success');
    } else {
      const id = 'work_' + Date.now();
      await db.collegeWork.add({
        id,
        title: editingItem.title.trim(),
        description: editingItem.description?.trim() || '',
        subjectId: editingItem.subjectId || subjects[0]?.id || '',
        category: (editingItem.category || 'assignment') as WorkCategory,
        assignedDate: todayStr,
        dueDate: editingItem.dueDate || todayStr,
        priority: (editingItem.priority || 'medium') as PriorityLevel,
        status: (editingItem.status || 'not_started') as WorkStatus,
        remarks: editingItem.remarks?.trim() || '',
        attachmentIds,
        links: [],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      await logActivity('created', 'work', editingItem.title.trim(), id);
      addToast('New academic work added', 'success');
    }

    setIsModalOpen(false);
    setEditingItem(null);
    setAttachmentFile(null);
  };

  // Render List View
  const renderListView = () => {
    if (filtered.length === 0) {
      return (
        <div className="vintage-card rounded p-12 text-center text-[var(--text-secondary)]">
          <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-40 text-[var(--accent)]" />
          <h3 className="font-serif text-base font-bold text-[var(--text-primary)]">No work records found</h3>
          <p className="text-xs font-mono mt-1">Adjust filters or record a new academic assignment.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {filtered.map(item => {
          const subject = subjects.find(s => s.id === item.subjectId);
          const isOverdue = item.dueDate < todayStr && item.status !== 'completed' && item.status !== 'submitted';
          const isDueToday = item.dueDate === todayStr && item.status !== 'completed' && item.status !== 'submitted';

          return (
            <div
              key={item.id}
              className={`vintage-card rounded p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                item.status === 'completed' || item.status === 'submitted'
                  ? 'opacity-70 bg-[var(--bg-inset)]/30'
                  : 'bg-[var(--bg-surface)]'
              }`}
            >
              <div className="flex items-start gap-3">
                <select
                  value={item.status}
                  onChange={(e) => handleStatusChange(item, e.target.value as WorkStatus)}
                  className="mt-0.5 text-xs font-mono p-1 rounded vintage-input capitalize"
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="submitted">Submitted</option>
                  <option value="archived">Archived</option>
                </select>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-serif font-bold text-sm text-[var(--text-primary)]">
                      {item.title}
                    </h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--bg-inset)] border border-[var(--border-color)] capitalize">
                      {item.category.replace('_', ' ')}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded uppercase font-bold ${
                        item.priority === 'urgent'
                          ? 'bg-[var(--accent-red)] text-white'
                          : item.priority === 'high'
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--bg-inset)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {item.priority}
                    </span>
                  </div>

                  {item.description && (
                    <p className="text-xs text-[var(--text-secondary)] font-body mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] font-mono text-[var(--text-secondary)]">
                    {subject && (
                      <span className="font-semibold text-[var(--accent)]">
                        {subject.name} ({subject.code})
                      </span>
                    )}

                    <span
                      className={`flex items-center gap-1 font-bold ${
                        isOverdue
                          ? 'text-[var(--accent-red)]'
                          : isDueToday
                          ? 'text-[var(--accent)]'
                          : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      <Calendar className="w-3 h-3" />
                      {isOverdue ? 'Overdue: ' : isDueToday ? 'Due Today: ' : 'Due: '}
                      {item.dueDate}
                    </span>

                    {item.attachmentIds.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Paperclip className="w-3 h-3 text-[var(--accent)]" />
                        {item.attachmentIds.length} file{item.attachmentIds.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end md:self-center">
                <button
                  onClick={() => {
                    setEditingItem(item);
                    setIsModalOpen(true);
                  }}
                  className="p-1.5 rounded vintage-btn-secondary"
                  title="Edit Item"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(item.id, item.title)}
                  className="p-1.5 rounded vintage-btn-secondary text-[var(--accent-red)] hover:border-[var(--accent-red)]"
                  title="Delete Item"
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

  // Render Kanban Board View
  const renderKanbanView = () => {
    const columns: { status: WorkStatus; label: string; count: number }[] = [
      { status: 'not_started', label: 'Not Started', count: filtered.filter(i => i.status === 'not_started').length },
      { status: 'in_progress', label: 'In Progress', count: filtered.filter(i => i.status === 'in_progress').length },
      { status: 'completed', label: 'Completed', count: filtered.filter(i => i.status === 'completed').length },
      { status: 'submitted', label: 'Submitted', count: filtered.filter(i => i.status === 'submitted').length },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map(col => {
          const colItems = filtered.filter(i => i.status === col.status);

          return (
            <div key={col.status} className="vintage-card-inset rounded p-3 flex flex-col max-h-[75vh]">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-[var(--border-color)]">
                <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-[var(--text-primary)]">
                  {col.label}
                </h4>
                <span className="font-mono text-xs px-1.5 py-0.2 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] font-bold">
                  {col.count}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5">
                {colItems.map(item => {
                  const subject = subjects.find(s => s.id === item.subjectId);
                  const isOverdue = item.dueDate < todayStr && item.status !== 'completed' && item.status !== 'submitted';

                  return (
                    <div
                      key={item.id}
                      className="vintage-card rounded p-3 space-y-2 cursor-pointer hover:border-[var(--text-primary)]"
                      onClick={() => {
                        setEditingItem(item);
                        setIsModalOpen(true);
                      }}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-[var(--accent)] font-bold">{subject?.code || 'GEN'}</span>
                        <span className={`px-1 rounded ${isOverdue ? 'bg-[var(--accent-red)] text-white font-bold' : 'text-[var(--text-secondary)]'}`}>
                          {item.dueDate}
                        </span>
                      </div>

                      <h5 className="font-serif font-bold text-xs text-[var(--text-primary)] line-clamp-2">
                        {item.title}
                      </h5>

                      <div className="flex items-center justify-between pt-1 border-t border-[var(--border-color)] text-[10px] font-mono text-[var(--text-secondary)]">
                        <span className="capitalize">{item.category.replace('_', ' ')}</span>
                        <div className="flex items-center gap-1">
                          <select
                            value={item.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleStatusChange(item, e.target.value as WorkStatus)}
                            className="bg-transparent border border-[var(--border-color)] rounded text-[9px] p-0.5"
                          >
                            <option value="not_started">Start</option>
                            <option value="in_progress">In Prog</option>
                            <option value="completed">Done</option>
                            <option value="submitted">Submitted</option>
                          </select>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id, item.title);
                            }}
                            className="p-1 text-[var(--text-secondary)] hover:text-[var(--accent-red)] rounded"
                            title="Delete Task"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--accent)] font-bold">
            Academic Tasks, Projects & Lab Work
          </span>
          <h1 className="text-2xl font-serif font-bold text-[var(--text-primary)]">
            College Work Manager
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggles */}
          <div className="flex rounded border border-[var(--border-color)] overflow-hidden font-mono text-xs">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 flex items-center gap-1 ${
                viewMode === 'list' ? 'bg-[var(--text-primary)] text-[var(--bg-surface)] font-bold' : 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 flex items-center gap-1 ${
                viewMode === 'kanban' ? 'bg-[var(--text-primary)] text-[var(--bg-surface)] font-bold' : 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('archive')}
              className={`px-3 py-1.5 flex items-center gap-1 ${
                viewMode === 'archive' ? 'bg-[var(--text-primary)] text-[var(--bg-surface)] font-bold' : 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archive</span>
            </button>
          </div>

          <button
            onClick={() => {
              setEditingItem({
                category: 'assignment',
                dueDate: todayStr,
                priority: 'medium',
                status: 'not_started'
              });
              setIsModalOpen(true);
            }}
            className="px-3 py-1.5 rounded vintage-btn-primary flex items-center gap-1.5 text-xs font-mono"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Work</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="vintage-card rounded p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-[var(--accent)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assignments, lab records, projects..."
            className="w-full bg-transparent border-none text-xs text-[var(--text-primary)] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="p-1.5 rounded vintage-input capitalize"
          >
            <option value="all">All Categories</option>
            <option value="assignment">Assignment</option>
            <option value="lab_record">Lab Record</option>
            <option value="project">Project</option>
            <option value="seminar">Seminar</option>
            <option value="presentation">Presentation</option>
            <option value="report">Report</option>
            <option value="examination">Examination</option>
            <option value="workshop">Workshop</option>
            <option value="college_activity">College Activity</option>
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

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="p-1.5 rounded vintage-input"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* View Content */}
      {viewMode === 'kanban' ? renderKanbanView() : renderListView()}

      {/* Add / Edit Work Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsModalOpen(false)} />
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="work-modal-title"
            className="relative w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border-color)] rounded shadow-2xl overflow-hidden z-10 flex flex-col"
          >
            <div className="p-3 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-surface-elevated)]">
              <h3 id="work-modal-title" className="font-serif font-bold text-sm text-[var(--text-primary)]">
                {editingItem?.id ? 'Edit Academic Task / Work' : 'Add College Work Item'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close modal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-4 space-y-3 overflow-y-auto max-h-[80vh]">
              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Task / Work Title *
                </label>
                <input
                  type="text"
                  required
                  value={editingItem?.title || ''}
                  onChange={(e) => setEditingItem(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Lab Exercise 5, Seminar Slide Deck"
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
                    value={editingItem?.subjectId || ''}
                    onChange={(e) => setEditingItem(prev => ({ ...prev, subjectId: e.target.value }))}
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
                    value={editingItem?.category || 'assignment'}
                    onChange={(e) => setEditingItem(prev => ({ ...prev, category: e.target.value as WorkCategory }))}
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={editingItem?.dueDate || todayStr}
                    onChange={(e) => setEditingItem(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full p-2 text-xs rounded vintage-input font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Priority
                  </label>
                  <select
                    value={editingItem?.priority || 'medium'}
                    onChange={(e) => setEditingItem(prev => ({ ...prev, priority: e.target.value as PriorityLevel }))}
                    className="w-full p-2 text-xs rounded vintage-input capitalize"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Status
                  </label>
                  <select
                    value={editingItem?.status || 'not_started'}
                    onChange={(e) => setEditingItem(prev => ({ ...prev, status: e.target.value as WorkStatus }))}
                    className="w-full p-2 text-xs rounded vintage-input capitalize"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="submitted">Submitted</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Description / Submission Criteria
                </label>
                <textarea
                  rows={3}
                  value={editingItem?.description || ''}
                  onChange={(e) => setEditingItem(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Questions to solve, report format, page limit..."
                  className="w-full p-2 text-xs rounded vintage-input"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Personal Remarks & Next Steps
                </label>
                <input
                  type="text"
                  value={editingItem?.remarks || ''}
                  onChange={(e) => setEditingItem(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Need to ask professor about question 3..."
                  className="w-full p-2 text-xs rounded vintage-input"
                />
              </div>

              {/* Attach File Directly into IndexedDB */}
              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Attach Local Document / PDF / Image (Stored in IndexedDB)
                </label>
                <input
                  type="file"
                  onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                  className="w-full text-xs font-mono file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-mono file:bg-[var(--text-primary)] file:text-[var(--bg-surface)] hover:file:bg-[var(--accent)]"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-2 border-t border-[var(--border-color)]">
                {editingItem?.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (editingItem?.id) {
                        handleDelete(editingItem.id, editingItem.title || 'Work Item');
                        setIsModalOpen(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded vintage-btn-secondary text-[var(--accent-red)] flex items-center gap-1.5 text-xs font-mono"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Work Item</span>
                  </button>
                ) : <div />}
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 rounded vintage-btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-1.5 rounded vintage-btn-primary">
                    Save Work
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
