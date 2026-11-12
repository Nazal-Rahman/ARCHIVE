import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  BookOpen,
  CheckSquare,
  Calendar,
  PenTool,
  BookmarkCheck,
  FolderArchive,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { db } from '../../db/database';
import type { Subject, CollegeWork, ScheduleEvent, Note, AcademicLog, FileItem } from '../../db/types';

export const GlobalSearchModal: React.FC = () => {
  const {
    isSearchOpen,
    setIsSearchOpen,
    setActiveTab,
    setSelectedSubjectId,
    setSelectedWorkId,
    setSelectedNoteId
  } = useApp();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    subjects: Subject[];
    work: CollegeWork[];
    schedules: ScheduleEvent[];
    notes: Note[];
    logs: AcademicLog[];
    files: FileItem[];
  }>({
    subjects: [],
    work: [],
    schedules: [],
    notes: [],
    logs: [],
    files: []
  });

  useEffect(() => {
    if (!isSearchOpen) {
      setQuery('');
      setResults({ subjects: [], work: [], schedules: [], notes: [], logs: [], files: [] });
      return;
    }

    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      setResults({ subjects: [], work: [], schedules: [], notes: [], logs: [], files: [] });
      return;
    }

    const performSearch = async () => {
      const [allSubjects, allWork, allSchedules, allNotes, allLogs, allFiles] = await Promise.all([
        db.subjects.toArray(),
        db.collegeWork.toArray(),
        db.schedules.toArray(),
        db.notes.toArray(),
        db.academicLogs.toArray(),
        db.files.toArray(),
      ]);

      setResults({
        subjects: allSubjects.filter(
          s => s.name.toLowerCase().includes(trimmed) || s.code.toLowerCase().includes(trimmed) || s.description.toLowerCase().includes(trimmed)
        ).slice(0, 5),
        work: allWork.filter(
          w => w.title.toLowerCase().includes(trimmed) || w.description.toLowerCase().includes(trimmed) || w.tags.some(t => t.toLowerCase().includes(trimmed))
        ).slice(0, 5),
        schedules: allSchedules.filter(
          sc => sc.title.toLowerCase().includes(trimmed) || (sc.description && sc.description.toLowerCase().includes(trimmed))
        ).slice(0, 5),
        notes: allNotes.filter(
          n => n.title.toLowerCase().includes(trimmed) || n.content.toLowerCase().includes(trimmed) || n.tags.some(t => t.toLowerCase().includes(trimmed))
        ).slice(0, 5),
        logs: allLogs.filter(
          l => l.title.toLowerCase().includes(trimmed) || l.description.toLowerCase().includes(trimmed) || l.tags.some(t => t.toLowerCase().includes(trimmed))
        ).slice(0, 5),
        files: allFiles.filter(
          f => f.displayName.toLowerCase().includes(trimmed) || f.originalName.toLowerCase().includes(trimmed)
        ).slice(0, 5),
      });
    };

    const timer = setTimeout(performSearch, 150);
    return () => clearTimeout(timer);
  }, [query, isSearchOpen]);

  if (!isSearchOpen) return null;

  const totalResults =
    results.subjects.length +
    results.work.length +
    results.schedules.length +
    results.notes.length +
    results.logs.length +
    results.files.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => setIsSearchOpen(false)}
      />

      {/* Modal Dialog */}
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-dialog-title"
        className="relative w-full max-w-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] rounded shadow-2xl overflow-hidden z-10 flex flex-col max-h-[75vh]"
      >
        {/* Search Input Bar */}
        <div className="p-3 border-b border-[var(--border-color)] flex items-center gap-3 bg-[var(--bg-surface-elevated)]">
          <Search className="w-5 h-5 text-[var(--accent)] shrink-0" />
          <h2 id="search-dialog-title" className="sr-only">Global Archive Search</h2>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subjects, assignments, notes, files, academic logs..."
            autoFocus
            className="w-full bg-transparent border-none text-[var(--text-primary)] placeholder-[var(--text-secondary)] font-body text-sm focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline text-[10px] font-mono bg-[var(--bg-inset)] px-2 py-0.5 rounded border border-[var(--border-color)] text-[var(--text-secondary)]">
            ESC
          </kbd>
        </div>

        {/* Search Results Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {query.trim() === '' ? (
            <div className="text-center py-10 text-[var(--text-secondary)]">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40 text-[var(--accent)]" />
              <p className="font-serif text-sm">Enter keywords to query your personal academic archive</p>
              <p className="text-[11px] font-mono mt-1 text-[var(--text-secondary)]">
                Indexes subjects, modules, assignments, notes, logs, and files
              </p>
            </div>
          ) : totalResults === 0 ? (
            <div className="text-center py-10 text-[var(--text-secondary)]">
              <p className="font-serif text-sm">No archive records found matching &ldquo;{query}&rdquo;</p>
              <p className="text-xs font-mono mt-1">Try searching by course code, topic, or tag.</p>
            </div>
          ) : (
            <>
              {/* Subjects */}
              {results.subjects.length > 0 && (
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5 mb-1.5 font-bold">
                    <BookOpen className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Subjects ({results.subjects.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.subjects.map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSelectedSubjectId(s.id);
                          setActiveTab('subjects');
                          setIsSearchOpen(false);
                        }}
                        className="w-full text-left p-2 rounded hover:bg-[var(--bg-inset)]/70 flex items-center justify-between group transition-colors border border-transparent hover:border-[var(--border-color)]"
                      >
                        <div>
                          <div className="text-xs font-serif font-bold text-[var(--text-primary)]">
                            {s.name} <span className="font-mono font-normal text-[10px] text-[var(--accent)]">({s.code})</span>
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)] line-clamp-1">{s.description}</div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* College Work / Assignments */}
              {results.work.length > 0 && (
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5 mb-1.5 font-bold">
                    <CheckSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>College Work & Tasks ({results.work.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.work.map(w => (
                      <button
                        key={w.id}
                        onClick={() => {
                          setSelectedWorkId(w.id);
                          setActiveTab('work');
                          setIsSearchOpen(false);
                        }}
                        className="w-full text-left p-2 rounded hover:bg-[var(--bg-inset)]/70 flex items-center justify-between group transition-colors border border-transparent hover:border-[var(--border-color)]"
                      >
                        <div>
                          <div className="text-xs font-serif font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <span>{w.title}</span>
                            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-[var(--bg-inset)] border border-[var(--border-color)] text-[var(--text-secondary)] capitalize">
                              {w.category.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)] line-clamp-1">Due: {w.dueDate} — {w.description}</div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {results.notes.length > 0 && (
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5 mb-1.5 font-bold">
                    <PenTool className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Notes & Journal ({results.notes.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.notes.map(n => (
                      <button
                        key={n.id}
                        onClick={() => {
                          setSelectedNoteId(n.id);
                          setActiveTab('notes');
                          setIsSearchOpen(false);
                        }}
                        className="w-full text-left p-2 rounded hover:bg-[var(--bg-inset)]/70 flex items-center justify-between group transition-colors border border-transparent hover:border-[var(--border-color)]"
                      >
                        <div>
                          <div className="text-xs font-serif font-bold text-[var(--text-primary)]">
                            {n.title}
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)] line-clamp-1">{n.content.replace(/[#*`]/g, '')}</div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Academic Logs */}
              {results.logs.length > 0 && (
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5 mb-1.5 font-bold">
                    <BookmarkCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Academic Logs ({results.logs.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.logs.map(l => (
                      <button
                        key={l.id}
                        onClick={() => {
                          setActiveTab('logbook');
                          setIsSearchOpen(false);
                        }}
                        className="w-full text-left p-2 rounded hover:bg-[var(--bg-inset)]/70 flex items-center justify-between group transition-colors border border-transparent hover:border-[var(--border-color)]"
                      >
                        <div>
                          <div className="text-xs font-serif font-bold text-[var(--text-primary)]">
                            Log #{String(l.logNumber).padStart(3, '0')}: {l.title}
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)] line-clamp-1">{l.date} — {l.description}</div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Schedules */}
              {results.schedules.length > 0 && (
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5 mb-1.5 font-bold">
                    <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Timetable & Events ({results.schedules.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.schedules.map(sc => (
                      <button
                        key={sc.id}
                        onClick={() => {
                          setActiveTab('scheduler');
                          setIsSearchOpen(false);
                        }}
                        className="w-full text-left p-2 rounded hover:bg-[var(--bg-inset)]/70 flex items-center justify-between group transition-colors border border-transparent hover:border-[var(--border-color)]"
                      >
                        <div>
                          <div className="text-xs font-serif font-bold text-[var(--text-primary)]">
                            {sc.title}
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)]">{sc.date} at {sc.startTime} - {sc.endTime}</div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Files */}
              {results.files.length > 0 && (
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5 mb-1.5 font-bold">
                    <FolderArchive className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Files & Documents ({results.files.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.files.map(f => (
                      <button
                        key={f.id}
                        onClick={() => {
                          setActiveTab('files');
                          setIsSearchOpen(false);
                        }}
                        className="w-full text-left p-2 rounded hover:bg-[var(--bg-inset)]/70 flex items-center justify-between group transition-colors border border-transparent hover:border-[var(--border-color)]"
                      >
                        <div>
                          <div className="text-xs font-mono font-bold text-[var(--text-primary)]">
                            {f.displayName}
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)] capitalize">{f.category} — {f.fileType.toUpperCase()}</div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
