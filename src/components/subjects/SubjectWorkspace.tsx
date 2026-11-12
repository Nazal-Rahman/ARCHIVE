import React, { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  FileText,
  FolderArchive,
  Link as LinkIcon,
  CheckSquare,
  Plus,
  Trash2,
  Edit2,
  Mail,
  Building,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, logActivity } from '../../db/database';
import type { Subject, Module, TopicItem, LinkItem } from '../../db/types';

interface SubjectWorkspaceProps {
  subjectId: string;
  onBack: () => void;
}

export const SubjectWorkspace: React.FC<SubjectWorkspaceProps> = ({ subjectId, onBack }) => {
  const { addToast, setSelectedWorkId, setActiveTab, setSelectedNoteId } = useApp();
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<
    'overview' | 'syllabus' | 'modules' | 'notes' | 'materials' | 'assignments' | 'links'
  >('overview');

  // Queries
  const subject = useLiveQuery(() => db.subjects.get(subjectId));
  const modules = useLiveQuery(() =>
    db.modules.where('subjectId').equals(subjectId).sortBy('orderIndex')
  ) || [];
  const subjectWork = useLiveQuery(() =>
    db.collegeWork.where('subjectId').equals(subjectId).toArray()
  ) || [];
  const subjectNotes = useLiveQuery(() =>
    db.notes.where('subjectId').equals(subjectId).toArray()
  ) || [];
  const subjectFiles = useLiveQuery(() =>
    db.files.where('subjectId').equals(subjectId).toArray()
  ) || [];

  // Module creation state
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');

  // Topic creation per module
  const [newTopicTitle, setNewTopicTitle] = useState<Record<string, string>>({});

  // Syllabus edit mode
  const [isEditingSyllabus, setIsEditingSyllabus] = useState(false);
  const [syllabusText, setSyllabusText] = useState(subject?.syllabus || '');

  // Reference Link addition
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  if (!subject) {
    return (
      <div className="p-8 text-center text-[var(--text-secondary)]">
        <p className="font-serif text-sm">Subject not found or has been archived.</p>
        <button onClick={onBack} className="mt-3 px-3 py-1.5 rounded vintage-btn-secondary text-xs">
          Return to Subjects
        </button>
      </div>
    );
  }

  // Calculate subject progress from topics
  let totalTopics = 0;
  let completedTopics = 0;
  modules.forEach(m => {
    m.topics.forEach(t => {
      totalTopics++;
      if (t.isCompleted) completedTopics++;
    });
  });
  const progressPercent = totalTopics === 0 ? 0 : Math.round((completedTopics / totalTopics) * 100);

  // Toggle Topic Completion
  const handleToggleTopic = async (module: Module, topicId: string) => {
    const updatedTopics = module.topics.map(t =>
      t.id === topicId ? { ...t, isCompleted: !t.isCompleted } : t
    );
    const allCompleted = updatedTopics.length > 0 && updatedTopics.every(t => t.isCompleted);

    await db.modules.update(module.id, {
      topics: updatedTopics,
      isCompleted: allCompleted,
      updatedAt: Date.now()
    });
  };

  // Add Topic to Module
  const handleAddTopic = async (module: Module) => {
    const title = newTopicTitle[module.id]?.trim();
    if (!title) return;

    const newTopic: TopicItem = {
      id: 'top_' + Date.now(),
      title,
      isCompleted: false
    };

    const updated = [...module.topics, newTopic];
    await db.modules.update(module.id, {
      topics: updated,
      isCompleted: false,
      updatedAt: Date.now()
    });

    setNewTopicTitle(prev => ({ ...prev, [module.id]: '' }));
    addToast('Topic added to module', 'success');
  };

  // Delete Topic
  const handleDeleteTopic = async (module: Module, topicId: string) => {
    const updated = module.topics.filter(t => t.id !== topicId);
    await db.modules.update(module.id, {
      topics: updated,
      updatedAt: Date.now()
    });
  };

  // Create Module
  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleName.trim()) return;

    const id = 'mod_' + Date.now();
    await db.modules.add({
      id,
      subjectId: subject.id,
      name: newModuleName.trim(),
      orderIndex: modules.length + 1,
      description: newModuleDesc.trim(),
      topics: [],
      isCompleted: false,
      attachmentIds: [],
      links: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    setNewModuleName('');
    setNewModuleDesc('');
    setIsAddingModule(false);
    addToast('New course module added', 'success');
  };

  // Delete Module
  const handleDeleteModule = async (moduleId: string, moduleName: string) => {
    if (window.confirm(`Delete module "${moduleName}" and its topics?`)) {
      await db.modules.delete(moduleId);
      addToast('Module removed', 'info');
    }
  };

  // Save Syllabus
  const handleSaveSyllabus = async () => {
    await db.subjects.update(subject.id, {
      syllabus: syllabusText,
      updatedAt: Date.now()
    });
    setIsEditingSyllabus(false);
    addToast('Syllabus updated', 'success');
  };

  // Add Reference Link
  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return;

    // We can store reference links inside a dedicated note or attach to subject modules
    // If no module, create a general link note
    const id = 'note_link_' + Date.now();
    await db.notes.add({
      id,
      title: `Reference: ${newLinkTitle.trim()}`,
      content: `[${newLinkTitle.trim()}](${newLinkUrl.trim()})\n\nCourse reference link for ${subject.name}`,
      subjectId: subject.id,
      category: 'subject',
      tags: ['Reference', 'Link'],
      isFavorite: false,
      isPinned: false,
      attachmentIds: [],
      links: [{ title: newLinkTitle.trim(), url: newLinkUrl.trim() }],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    setNewLinkTitle('');
    setNewLinkUrl('');
    addToast('Reference link saved', 'success');
  };

  const handleDeleteSubject = async () => {
    if (window.confirm(`Permanently delete subject "${subject.name}" and all its course modules?`)) {
      await db.modules.where('subjectId').equals(subject.id).delete();
      await db.subjects.delete(subject.id);
      addToast('Subject and modules removed', 'info');
      onBack();
    }
  };

  return (
    <div className="space-y-6">
      {/* Workspace Header Bar */}
      <div className="vintage-card rounded p-4 sm:p-6 border-l-4" style={{ borderLeftColor: subject.color || '#B66A3C' }}>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Subjects Overview</span>
          </button>
          <button
            onClick={handleDeleteSubject}
            className="inline-flex items-center gap-1 text-xs font-mono text-[var(--accent-red)] hover:underline p-1"
            title="Delete this subject"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Subject</span>
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--bg-inset)] font-bold text-[var(--accent)] border border-[var(--border-color)]">
                {subject.code}
              </span>
              <span className="text-xs font-mono text-[var(--text-secondary)]">
                {subject.semester} • {subject.credits} Credits
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--text-primary)] mt-1">
              {subject.name}
            </h1>
            <p className="text-xs text-[var(--text-secondary)] font-body mt-1 max-w-2xl">
              {subject.description}
            </p>
          </div>

          {/* Progress Pill */}
          <div className="bg-[var(--bg-surface-elevated)] p-3 rounded border border-[var(--border-color)] sm:w-48 text-right">
            <div className="flex items-center justify-between text-xs font-mono mb-1">
              <span className="text-[var(--text-secondary)]">Syllabus Completion</span>
              <span className="font-bold text-[var(--accent)]">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--bg-inset)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%`, backgroundColor: subject.color || '#B66A3C' }}
              />
            </div>
            <div className="text-[10px] text-[var(--text-secondary)] font-mono mt-1">
              {completedTopics} of {totalTopics} topics studied
            </div>
          </div>
        </div>

        {/* 7 Dedicated Tabs */}
        <div className="flex border-b border-[var(--border-color)] overflow-x-auto mt-6 text-xs font-mono">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'syllabus', label: 'Syllabus' },
            { id: 'modules', label: `Modules (${modules.length})` },
            { id: 'notes', label: `Notes (${subjectNotes.length})` },
            { id: 'materials', label: `Materials (${subjectFiles.length})` },
            { id: 'assignments', label: `Work & Tasks (${subjectWork.length})` },
            { id: 'links', label: 'Reference Links' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveWorkspaceTab(tab.id as typeof activeWorkspaceTab)}
              className={`px-4 py-2.5 whitespace-nowrap border-b-2 font-medium transition-colors ${
                activeWorkspaceTab === tab.id
                  ? 'border-[var(--accent)] font-bold text-[var(--text-primary)] bg-[var(--bg-inset)]/30'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeWorkspaceTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Instructor Details Card */}
            <div className="vintage-card rounded p-4">
              <h3 className="font-serif font-bold text-sm text-[var(--text-primary)] mb-3 pb-2 border-b border-[var(--border-color)]">
                Instructor & Academic Advising
              </h3>
              {subject.instructor?.name ? (
                <div className="space-y-2 text-xs">
                  <div className="font-serif font-bold text-base text-[var(--text-primary)]">
                    {subject.instructor.name}
                  </div>
                  {subject.instructor.email && (
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] font-mono">
                      <Mail className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <a href={`mailto:${subject.instructor.email}`} className="hover:underline">
                        {subject.instructor.email}
                      </a>
                    </div>
                  )}
                  {subject.instructor.office && (
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <Building className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span>{subject.instructor.office}</span>
                    </div>
                  )}
                  {subject.instructor.notes && (
                    <div className="p-2.5 rounded bg-[var(--bg-inset)]/40 border border-[var(--border-color)] text-[var(--text-secondary)] font-body mt-2">
                      {subject.instructor.notes}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-secondary)] italic">
                  No instructor contact details recorded. Edit the subject to add office hours and email.
                </p>
              )}
            </div>

            {/* Course Summary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="vintage-card rounded p-3 text-center">
                <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">Modules</span>
                <div className="text-xl font-serif font-bold text-[var(--text-primary)]">{modules.length}</div>
              </div>
              <div className="vintage-card rounded p-3 text-center">
                <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">Topics Logged</span>
                <div className="text-xl font-serif font-bold text-[var(--text-primary)]">{totalTopics}</div>
              </div>
              <div className="vintage-card rounded p-3 text-center">
                <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">Assignments</span>
                <div className="text-xl font-serif font-bold text-[var(--text-primary)]">{subjectWork.length}</div>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="vintage-card rounded p-4 space-y-3">
            <h3 className="font-serif font-bold text-sm text-[var(--text-primary)] pb-2 border-b border-[var(--border-color)]">
              Subject Actions
            </h3>
            <button
              onClick={() => setActiveWorkspaceTab('modules')}
              className="w-full text-left p-2 rounded hover:bg-[var(--bg-inset)]/60 text-xs font-mono flex items-center justify-between"
            >
              <span>Manage Modules & Topics</span>
              <BookOpen className="w-3.5 h-3.5 text-[var(--accent)]" />
            </button>
            <button
              onClick={() => setActiveWorkspaceTab('syllabus')}
              className="w-full text-left p-2 rounded hover:bg-[var(--bg-inset)]/60 text-xs font-mono flex items-center justify-between"
            >
              <span>View Course Syllabus</span>
              <FileText className="w-3.5 h-3.5 text-[var(--accent)]" />
            </button>
            <button
              onClick={() => setActiveWorkspaceTab('materials')}
              className="w-full text-left p-2 rounded hover:bg-[var(--bg-inset)]/60 text-xs font-mono flex items-center justify-between"
            >
              <span>Browse Digital Materials</span>
              <FolderArchive className="w-3.5 h-3.5 text-[var(--accent)]" />
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Syllabus */}
      {activeWorkspaceTab === 'syllabus' && (
        <div className="vintage-card rounded p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
            <h3 className="font-serif font-bold text-base text-[var(--text-primary)]">
              Official Course Syllabus & Unit Guidelines
            </h3>
            {!isEditingSyllabus ? (
              <button
                onClick={() => {
                  setSyllabusText(subject.syllabus || '');
                  setIsEditingSyllabus(true);
                }}
                className="px-3 py-1 rounded vintage-btn-secondary text-xs flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Syllabus</span>
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditingSyllabus(false)}
                  className="px-3 py-1 rounded vintage-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSyllabus}
                  className="px-3 py-1 rounded vintage-btn-primary text-xs"
                >
                  Save Syllabus
                </button>
              </div>
            )}
          </div>

          {isEditingSyllabus ? (
            <textarea
              rows={16}
              value={syllabusText}
              onChange={(e) => setSyllabusText(e.target.value)}
              placeholder="Paste or write the complete course syllabus, learning objectives, and reading lists here..."
              className="w-full p-3 rounded vintage-input font-mono text-xs leading-relaxed"
            />
          ) : (
            <div className="prose max-w-none text-xs font-body leading-relaxed whitespace-pre-wrap text-[var(--text-primary)] p-2">
              {subject.syllabus || 'No syllabus provided yet. Click "Edit Syllabus" above to add course units.'}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Modules & Topics */}
      {activeWorkspaceTab === 'modules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-base text-[var(--text-primary)]">
              Course Modules ({modules.length})
            </h3>
            <button
              onClick={() => setIsAddingModule(true)}
              className="px-3 py-1.5 rounded vintage-btn-primary flex items-center gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Module</span>
            </button>
          </div>

          {/* Add Module Inline Form */}
          {isAddingModule && (
            <form onSubmit={handleCreateModule} className="vintage-card-inset rounded p-4 space-y-3">
              <h4 className="font-serif font-bold text-xs uppercase text-[var(--accent)]">
                Create New Course Module
              </h4>
              <input
                type="text"
                required
                value={newModuleName}
                onChange={(e) => setNewModuleName(e.target.value)}
                placeholder="e.g. Module 2: Concurrency & Semaphores"
                className="w-full p-2 text-xs rounded vintage-input"
                autoFocus
              />
              <textarea
                rows={2}
                value={newModuleDesc}
                onChange={(e) => setNewModuleDesc(e.target.value)}
                placeholder="Brief module description..."
                className="w-full p-2 text-xs rounded vintage-input"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsAddingModule(false)} className="px-3 py-1 rounded vintage-btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1 rounded vintage-btn-primary text-xs">
                  Save Module
                </button>
              </div>
            </form>
          )}

          {/* Modules List */}
          {modules.length === 0 ? (
            <div className="vintage-card rounded p-10 text-center text-[var(--text-secondary)]">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40 text-[var(--accent)]" />
              <p className="font-serif text-sm">No modules created for this subject yet.</p>
              <p className="text-xs font-mono mt-1">Break down this course into modules and track topic progress.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {modules.map((mod) => {
                const completedCount = mod.topics.filter(t => t.isCompleted).length;
                const modProgress = mod.topics.length === 0 ? 0 : Math.round((completedCount / mod.topics.length) * 100);

                return (
                  <div key={mod.id} className="vintage-card rounded p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3 pb-2 border-b border-[var(--border-color)]">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-serif font-bold text-sm text-[var(--text-primary)]">
                            {mod.name}
                          </h4>
                          {mod.isCompleted && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--accent-olive)] text-white font-bold">
                              COMPLETED
                            </span>
                          )}
                        </div>
                        {mod.description && (
                          <p className="text-xs text-[var(--text-secondary)] font-body mt-0.5">
                            {mod.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-[var(--accent)] font-bold">
                          {modProgress}%
                        </span>
                        <button
                          onClick={() => handleDeleteModule(mod.id, mod.name)}
                          className="p-1 text-[var(--text-secondary)] hover:text-[var(--accent-red)] rounded"
                          title="Delete Module"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Topics Checklist */}
                    <div className="space-y-1.5 pl-2">
                      <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider block font-bold">
                        Topics ({completedCount}/{mod.topics.length})
                      </span>
                      {mod.topics.map(t => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-1.5 rounded hover:bg-[var(--bg-inset)]/50 group text-xs transition-colors"
                        >
                          <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={t.isCompleted}
                              onChange={() => handleToggleTopic(mod, t.id)}
                              className="accent-[var(--accent-olive)] cursor-pointer"
                            />
                            <span className={`truncate font-body ${t.isCompleted ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
                              {t.title}
                            </span>
                          </label>
                          <button
                            onClick={() => handleDeleteTopic(mod, t.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-secondary)] hover:text-[var(--accent-red)] transition-opacity"
                            title="Remove Topic"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {/* Add Topic Input */}
                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="text"
                          value={newTopicTitle[mod.id] || ''}
                          onChange={(e) => setNewTopicTitle(prev => ({ ...prev, [mod.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTopic(mod);
                            }
                          }}
                          placeholder="+ Add new topic title and press Enter..."
                          className="flex-1 p-1.5 text-xs rounded vintage-input"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddTopic(mod)}
                          className="px-2.5 py-1.5 rounded vintage-btn-secondary text-xs font-mono"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Notes */}
      {activeWorkspaceTab === 'notes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-base text-[var(--text-primary)]">
              Notebook Entries for {subject.name}
            </h3>
            <button
              onClick={() => {
                setActiveTab('notes');
              }}
              className="px-3 py-1.5 rounded vintage-btn-primary text-xs"
            >
              Open Notebook
            </button>
          </div>

          {subjectNotes.length === 0 ? (
            <div className="vintage-card rounded p-10 text-center text-[var(--text-secondary)]">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40 text-[var(--accent)]" />
              <p className="font-serif text-sm">No notes categorized under this subject yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {subjectNotes.map(n => (
                <div
                  key={n.id}
                  onClick={() => {
                    setSelectedNoteId(n.id);
                    setActiveTab('notes');
                  }}
                  className="vintage-card vintage-card-hover rounded p-4 cursor-pointer"
                >
                  <h4 className="font-serif font-bold text-sm text-[var(--text-primary)] mb-1">
                    {n.title}
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-3 font-body">
                    {n.content.replace(/[#*`]/g, '')}
                  </p>
                  <div className="text-[10px] font-mono text-[var(--text-secondary)] mt-3 pt-2 border-t border-[var(--border-color)] flex justify-between">
                    <span>{new Date(n.updatedAt).toLocaleDateString()}</span>
                    <span className="capitalize">{n.category}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Materials */}
      {activeWorkspaceTab === 'materials' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-base text-[var(--text-primary)]">
              Attached Digital Files & Readings ({subjectFiles.length})
            </h3>
            <button
              onClick={() => setActiveTab('files')}
              className="px-3 py-1.5 rounded vintage-btn-primary text-xs"
            >
              Go to File Gallery
            </button>
          </div>

          {subjectFiles.length === 0 ? (
            <div className="vintage-card rounded p-10 text-center text-[var(--text-secondary)]">
              <FolderArchive className="w-8 h-8 mx-auto mb-2 opacity-40 text-[var(--accent)]" />
              <p className="font-serif text-sm">No course materials or PDFs uploaded for this subject.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {subjectFiles.map(f => (
                <div
                  key={f.id}
                  onClick={() => setActiveTab('files')}
                  className="vintage-card rounded p-3 flex items-center gap-3 cursor-pointer hover:border-[var(--text-primary)]"
                >
                  <div className="w-9 h-9 rounded bg-[var(--bg-inset)] flex items-center justify-center font-mono text-xs font-bold uppercase text-[var(--accent)]">
                    {f.fileType.substring(0, 3)}
                  </div>
                  <div className="truncate flex-1">
                    <div className="text-xs font-mono font-bold text-[var(--text-primary)] truncate">
                      {f.displayName}
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)]">
                      {Math.round(f.fileSize / 1024)} KB
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Assignments & Work */}
      {activeWorkspaceTab === 'assignments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-base text-[var(--text-primary)]">
              Assignments & Lab Records ({subjectWork.length})
            </h3>
            <button
              onClick={() => setActiveTab('work')}
              className="px-3 py-1.5 rounded vintage-btn-primary text-xs"
            >
              All College Work
            </button>
          </div>

          {subjectWork.length === 0 ? (
            <div className="vintage-card rounded p-10 text-center text-[var(--text-secondary)]">
              <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-40 text-[var(--accent)]" />
              <p className="font-serif text-sm">No work items or assignments registered for this course.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {subjectWork.map(w => (
                <div
                  key={w.id}
                  onClick={() => {
                    setSelectedWorkId(w.id);
                    setActiveTab('work');
                  }}
                  className="vintage-card rounded p-3 flex items-center justify-between gap-3 cursor-pointer hover:border-[var(--text-primary)]"
                >
                  <div>
                    <h4 className="text-xs font-serif font-bold text-[var(--text-primary)]">
                      {w.title}
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)] font-body line-clamp-1">
                      {w.description}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-inset)] border border-[var(--border-color)]">
                      Due: {w.dueDate}
                    </span>
                    <div className="text-[10px] font-mono text-[var(--accent)] capitalize mt-1">
                      {w.status.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 7: Reference Links */}
      {activeWorkspaceTab === 'links' && (
        <div className="space-y-4">
          <form onSubmit={handleAddLink} className="vintage-card-inset rounded p-4 flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              required
              value={newLinkTitle}
              onChange={(e) => setNewLinkTitle(e.target.value)}
              placeholder="Link title (e.g. Stanford Lecture Slides)"
              className="flex-1 p-2 text-xs rounded vintage-input"
            />
            <input
              type="url"
              required
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 p-2 text-xs rounded vintage-input font-mono"
            />
            <button type="submit" className="px-4 py-2 rounded vintage-btn-primary text-xs shrink-0">
              Save Link
            </button>
          </form>

          <div className="vintage-card rounded p-4 space-y-2">
            <h4 className="font-serif font-bold text-xs uppercase text-[var(--text-secondary)] pb-2 border-b border-[var(--border-color)]">
              Reference Repositories & Lecture Portals
            </h4>
            {subjectNotes.filter(n => n.tags.includes('Link') || n.links.length > 0).length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] italic py-3 text-center">
                No reference links added yet.
              </p>
            ) : (
              subjectNotes
                .filter(n => n.tags.includes('Link') || n.links.length > 0)
                .map(n => (
                  <div key={n.id} className="p-2.5 rounded bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-serif font-bold text-[var(--text-primary)]">{n.title}</div>
                      {n.links.map((lnk, idx) => (
                        <a
                          key={idx}
                          href={lnk.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-mono text-[var(--accent)] hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>{lnk.url}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
