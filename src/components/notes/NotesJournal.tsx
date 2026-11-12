import React, { useState, useEffect, useRef } from 'react';
import {
  PenTool,
  Plus,
  Search,
  Pin,
  Star,
  Trash2,
  Bold,
  Italic,
  Heading,
  List,
  Code,
  CheckSquare,
  BookOpen,
  Calendar,
  Save,
  Check
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, logActivity } from '../../db/database';
import type { Note, NoteCategory } from '../../db/types';

export const NotesJournal: React.FC = () => {
  const { selectedNoteId, setSelectedNoteId, addToast } = useApp();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSavedIndicator, setIsSavedIndicator] = useState(true);

  // Active note in editor
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorCategory, setEditorCategory] = useState<NoteCategory>('study');
  const [editorSubjectId, setEditorSubjectId] = useState<string>('');
  const [editorTags, setEditorTags] = useState('');

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Queries
  const allNotes = useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray()) || [];
  const subjects = useLiveQuery(() => db.subjects.where('isArchived').equals(0).toArray()) || [];

  // Initialize or sync active note
  useEffect(() => {
    if (selectedNoteId) {
      const found = allNotes.find(n => n.id === selectedNoteId);
      if (found) {
        setActiveNote(found);
        setEditorTitle(found.title);
        setEditorContent(found.content);
        setEditorCategory(found.category);
        setEditorSubjectId(found.subjectId || '');
        setEditorTags(found.tags.join(', '));
      }
    } else if (allNotes.length > 0 && !activeNote) {
      const first = allNotes[0];
      setActiveNote(first);
      setEditorTitle(first.title);
      setEditorContent(first.content);
      setEditorCategory(first.category);
      setEditorSubjectId(first.subjectId || '');
      setEditorTags(first.tags.join(', '));
    }
  }, [allNotes, selectedNoteId]);

  // Auto-Save Effect
  const handleContentChange = (content: string) => {
    setEditorContent(content);
    setIsSavedIndicator(false);

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      if (activeNote) {
        await db.notes.update(activeNote.id, {
          content,
          updatedAt: Date.now()
        });
        setIsSavedIndicator(true);
      }
    }, 800);
  };

  const handleTitleChange = (title: string) => {
    setEditorTitle(title);
    setIsSavedIndicator(false);

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      if (activeNote) {
        await db.notes.update(activeNote.id, {
          title,
          updatedAt: Date.now()
        });
        setIsSavedIndicator(true);
      }
    }, 800);
  };

  // Create New Note
  const handleCreateNewNote = async () => {
    const id = 'note_' + Date.now();
    const newNote: Note = {
      id,
      title: 'Untitled Note',
      content: '',
      category: (activeCategory !== 'all' ? activeCategory : 'study') as NoteCategory,
      tags: [],
      isFavorite: false,
      isPinned: false,
      attachmentIds: [],
      links: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await db.notes.add(newNote);
    await logActivity('created', 'note', 'Untitled Note', id);
    setSelectedNoteId(id);
    setActiveNote(newNote);
    setEditorTitle(newNote.title);
    setEditorContent(newNote.content);
    setEditorCategory(newNote.category);
    setEditorTags('');
    addToast('New parchment note opened', 'info');
  };

  // Toggle Favorite
  const handleToggleFavorite = async (note: Note) => {
    await db.notes.update(note.id, {
      isFavorite: !note.isFavorite,
      updatedAt: Date.now()
    });
  };

  // Toggle Pin
  const handleTogglePin = async (note: Note) => {
    await db.notes.update(note.id, {
      isPinned: !note.isPinned,
      updatedAt: Date.now()
    });
  };

  // Delete Note
  const handleDeleteNote = async (note: Note) => {
    if (window.confirm(`Delete notebook note "${note.title}"?`)) {
      await db.notes.delete(note.id);
      await logActivity('deleted', 'note', note.title, note.id);
      if (activeNote?.id === note.id) {
        setActiveNote(null);
        setSelectedNoteId(null);
      }
      addToast('Note deleted', 'info');
    }
  };

  // Insert Markdown helper
  const insertMarkdown = (prefix: string, suffix = '') => {
    const textarea = document.getElementById('note-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = editorContent.substring(start, end);
    const replacement = `${prefix}${selected || 'text'}${suffix}`;

    const newContent = editorContent.substring(0, start) + replacement + editorContent.substring(end);
    handleContentChange(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected ? selected.length : 4));
    }, 50);
  };

  // Filtered Notes list
  const filteredNotes = allNotes.filter(n => {
    if (activeCategory !== 'all' && n.category !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Sort pinned to top
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.updatedAt - a.updatedAt;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--accent)] font-bold">
            Scholar Parchment & Writing Desk
          </span>
          <h1 className="text-2xl font-serif font-bold text-[var(--text-primary)]">
            Notes & Personal Journal
          </h1>
        </div>

        <button
          onClick={handleCreateNewNote}
          className="px-3 py-1.5 rounded vintage-btn-primary flex items-center gap-1.5 text-xs font-mono self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Entry</span>
        </button>
      </div>

      {/* Two-Pane Writing Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[700px]">
        {/* Left Column: Notes List & Categories (4 cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-3">
          {/* Search bar */}
          <div className="vintage-card rounded p-2.5 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-[var(--accent)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notebook notes..."
              className="w-full bg-transparent border-none text-xs text-[var(--text-primary)] focus:outline-none"
            />
          </div>

          {/* Categories pill row */}
          <div className="flex border-b border-[var(--border-color)] overflow-x-auto pb-1 text-xs font-mono gap-1">
            {['all', 'study', 'subject', 'journal', 'quick', 'important'].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded capitalize whitespace-nowrap transition-colors ${
                  activeCategory === cat
                    ? 'bg-[var(--text-primary)] text-[var(--bg-surface)] font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-inset)]/40'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Notes list items */}
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[600px] pr-1">
            {sortedNotes.length === 0 ? (
              <div className="vintage-card rounded p-8 text-center text-[var(--text-secondary)]">
                <PenTool className="w-8 h-8 mx-auto mb-2 opacity-40 text-[var(--accent)]" />
                <p className="font-serif text-xs">No entries match your search</p>
              </div>
            ) : (
              sortedNotes.map(n => {
                const isSelected = activeNote?.id === n.id;
                const subject = subjects.find(s => s.id === n.subjectId);

                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      setActiveNote(n);
                      setSelectedNoteId(n.id);
                      setEditorTitle(n.title);
                      setEditorContent(n.content);
                      setEditorCategory(n.category);
                      setEditorSubjectId(n.subjectId || '');
                      setEditorTags(n.tags.join(', '));
                    }}
                    className={`vintage-card rounded p-3 cursor-pointer transition-all border ${
                      isSelected
                        ? 'border-[var(--text-primary)] shadow-sm bg-[var(--bg-surface-elevated)]'
                        : 'border-[var(--border-color)] hover:border-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                      <span className="text-[var(--accent)] font-semibold uppercase">{n.category}</span>
                      <div className="flex items-center gap-1.5">
                        {n.isPinned && <Pin className="w-3 h-3 text-[var(--accent)] fill-[var(--accent)]" />}
                        {n.isFavorite && <Star className="w-3 h-3 text-[var(--accent)] fill-[var(--accent)]" />}
                        <span className="text-[var(--text-secondary)]">
                          {new Date(n.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <h4 className="font-serif font-bold text-xs text-[var(--text-primary)] line-clamp-1">
                      {n.title || 'Untitled'}
                    </h4>

                    <p className="text-[11px] text-[var(--text-secondary)] font-body line-clamp-2 mt-1">
                      {n.content ? n.content.replace(/[#*`]/g, '') : 'No content...'}
                    </p>

                    {subject && (
                      <div className="mt-2 text-[10px] font-mono text-[var(--accent)]">
                        {subject.code}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Parchment Editor (8 cols) */}
        <div className="lg:col-span-8 flex flex-col vintage-card rounded overflow-hidden">
          {activeNote ? (
            <>
              {/* Editor Header & Markdown Toolbar */}
              <div className="p-3 border-b border-[var(--border-color)] bg-[var(--bg-surface-elevated)] flex flex-wrap items-center justify-between gap-3">
                {/* Markdown Tools */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => insertMarkdown('**', '**')}
                    className="p-1.5 rounded vintage-btn-secondary"
                    title="Bold (**text**)"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => insertMarkdown('*', '*')}
                    className="p-1.5 rounded vintage-btn-secondary"
                    title="Italic (*text*)"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => insertMarkdown('### ')}
                    className="p-1.5 rounded vintage-btn-secondary"
                    title="Heading (### text)"
                  >
                    <Heading className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => insertMarkdown('- ')}
                    className="p-1.5 rounded vintage-btn-secondary"
                    title="Bullet List (- item)"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => insertMarkdown('- [ ] ')}
                    className="p-1.5 rounded vintage-btn-secondary"
                    title="Checklist task"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => insertMarkdown('`', '`')}
                    className="p-1.5 rounded vintage-btn-secondary"
                    title="Inline Code (`code`)"
                  >
                    <Code className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Right controls: Pin, Favorite, Delete, Save Status */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-[var(--text-secondary)] flex items-center gap-1">
                    {isSavedIndicator ? (
                      <>
                        <Check className="w-3 h-3 text-[var(--accent-olive)]" />
                        <span>Saved</span>
                      </>
                    ) : (
                      <span className="italic text-[var(--accent)]">Saving...</span>
                    )}
                  </span>

                  <button
                    onClick={() => handleTogglePin(activeNote)}
                    className={`p-1.5 rounded vintage-btn-secondary ${activeNote.isPinned ? 'text-[var(--accent)] border-[var(--accent)]' : ''}`}
                    title="Pin note to top"
                  >
                    <Pin className={`w-3.5 h-3.5 ${activeNote.isPinned ? 'fill-[var(--accent)]' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleToggleFavorite(activeNote)}
                    className={`p-1.5 rounded vintage-btn-secondary ${activeNote.isFavorite ? 'text-[var(--accent)] border-[var(--accent)]' : ''}`}
                    title="Add to favorites"
                  >
                    <Star className={`w-3.5 h-3.5 ${activeNote.isFavorite ? 'fill-[var(--accent)]' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleDeleteNote(activeNote)}
                    className="p-1.5 rounded vintage-btn-secondary text-[var(--accent-red)]"
                    title="Delete Note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Title & Category Bar */}
              <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-surface)] space-y-3">
                <input
                  type="text"
                  value={editorTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Note Title..."
                  className="w-full text-xl sm:text-2xl font-serif font-bold bg-transparent border-none text-[var(--text-primary)] focus:outline-none tracking-tight placeholder-[var(--text-secondary)]"
                />

                <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[var(--text-secondary)]">Category:</span>
                    <select
                      value={editorCategory}
                      onChange={async (e) => {
                        const val = e.target.value as NoteCategory;
                        setEditorCategory(val);
                        await db.notes.update(activeNote.id, { category: val, updatedAt: Date.now() });
                      }}
                      className="p-1 rounded vintage-input capitalize"
                    >
                      <option value="study">Study</option>
                      <option value="subject">Subject</option>
                      <option value="journal">Journal</option>
                      <option value="quick">Quick Note</option>
                      <option value="personal">Personal</option>
                      <option value="important">Important</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[var(--text-secondary)]">Subject:</span>
                    <select
                      value={editorSubjectId}
                      onChange={async (e) => {
                        const val = e.target.value;
                        setEditorSubjectId(val);
                        await db.notes.update(activeNote.id, { subjectId: val || undefined, updatedAt: Date.now() });
                      }}
                      className="p-1 rounded vintage-input"
                    >
                      <option value="">(None)</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Writing Canvas / Ruled Notebook Textarea */}
              <div className="flex-1 p-6 bg-[var(--bg-surface)]">
                <textarea
                  id="note-textarea"
                  value={editorContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Write scholarly notes, thesis outlines, derivations, lecture thoughts... (Markdown supported)"
                  className="w-full h-full min-h-[450px] bg-transparent border-none text-sm font-body leading-relaxed text-[var(--text-primary)] focus:outline-none notebook-ruled resize-none placeholder-[var(--text-secondary)]/50"
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-[var(--text-secondary)]">
              <PenTool className="w-12 h-12 mb-3 opacity-30 text-[var(--accent)]" />
              <h3 className="font-serif text-lg font-bold text-[var(--text-primary)]">
                No note selected
              </h3>
              <p className="text-xs font-mono mt-1">Select an entry from the ledger or create a new note.</p>
              <button
                onClick={handleCreateNewNote}
                className="mt-4 px-4 py-2 rounded vintage-btn-primary text-xs font-mono"
              >
                Create First Entry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
