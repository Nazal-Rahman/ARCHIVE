import React, { useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  BookOpen,
  Clock,
  TrendingUp,
  Plus,
  Calendar,
  Award,
  Zap,
  Target
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, logActivity } from '../../db/database';
import confetti from 'canvas-confetti';
import type { StudySession } from '../../db/types';

export const ProgressTracker: React.FC = () => {
  const { settings, addToast } = useApp();

  const [isLogSessionOpen, setIsLogSessionOpen] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(60);
  const [sessionSubjectId, setSessionSubjectId] = useState('');
  const [sessionTopics, setSessionTopics] = useState('');

  // Real data queries
  const subjects = useLiveQuery(() => db.subjects.where('isArchived').equals(0).toArray()) || [];
  const modules = useLiveQuery(() => db.modules.toArray()) || [];
  const allWork = useLiveQuery(() => db.collegeWork.toArray()) || [];
  const studySessions = useLiveQuery(() => db.studySessions.toArray()) || [];

  // Calculate global topics stats
  let totalTopics = 0;
  let completedTopics = 0;
  modules.forEach(m => {
    m.topics.forEach(t => {
      totalTopics++;
      if (t.isCompleted) completedTopics++;
    });
  });
  const topicCompletionRate = totalTopics === 0 ? 0 : Math.round((completedTopics / totalTopics) * 100);

  // Calculate work stats
  const totalWork = allWork.length;
  const completedWork = allWork.filter(w => w.status === 'completed' || w.status === 'submitted').length;
  const workCompletionRate = totalWork === 0 ? 0 : Math.round((completedWork / totalWork) * 100);

  // Calculate weekly study hours from real logged sessions (last 7 days)
  const oneWeekAgo = Date.now() - 7 * 86400000;
  const weeklySessions = studySessions.filter(s => s.createdAt >= oneWeekAgo);
  const weeklyStudyMinutes = weeklySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const weeklyStudyHours = Math.round((weeklyStudyMinutes / 60) * 10) / 10;
  const weeklyTarget = settings.targetStudyHoursWeekly || 25;
  const studyTargetProgress = Math.min(100, Math.round((weeklyStudyHours / weeklyTarget) * 100));

  // Log study session
  const handleSaveStudySession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionDuration <= 0) return;

    const id = 'session_' + Date.now();
    await db.studySessions.add({
      id,
      subjectId: sessionSubjectId || undefined,
      date: new Date().toISOString().split('T')[0],
      durationMinutes: Number(sessionDuration),
      topicsCovered: sessionTopics.trim(),
      createdAt: Date.now()
    });

    confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
    await logActivity('created', 'event', `Study Session (${sessionDuration} mins)`, id);
    addToast(`Logged ${sessionDuration} minutes study session!`, 'success');

    setIsLogSessionOpen(false);
    setSessionDuration(60);
    setSessionTopics('');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--accent)] font-bold">
            Empirical Academic Analytics
          </span>
          <h1 className="text-2xl font-serif font-bold text-[var(--text-primary)]">
            Academic Progress Tracker
          </h1>
        </div>

        <button
          onClick={() => setIsLogSessionOpen(true)}
          className="px-3 py-1.5 rounded vintage-btn-primary flex items-center gap-1.5 text-xs font-mono"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Log Study Session</span>
        </button>
      </div>

      {/* Top 4 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Topic Completion Rate */}
        <div className="vintage-card rounded p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-[var(--accent)]/15 border border-[var(--accent)] text-[var(--accent)] flex items-center justify-center font-bold">
            {topicCompletionRate}%
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-[var(--text-secondary)] font-bold">Topics Mastered</span>
            <div className="text-sm font-serif font-bold text-[var(--text-primary)]">
              {completedTopics} / {totalTopics} Completed
            </div>
          </div>
        </div>

        {/* Metric 2: Academic Work Submitted */}
        <div className="vintage-card rounded p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-[var(--accent-olive)]/15 border border-[var(--accent-olive)] text-[var(--accent-olive)] flex items-center justify-center font-bold">
            {workCompletionRate}%
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-[var(--text-secondary)] font-bold">Tasks & Work</span>
            <div className="text-sm font-serif font-bold text-[var(--text-primary)]">
              {completedWork} / {totalWork} Completed
            </div>
          </div>
        </div>

        {/* Metric 3: Weekly Study Time */}
        <div className="vintage-card rounded p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-[var(--text-primary)] text-[var(--bg-surface)] flex items-center justify-center font-mono font-bold text-xs">
            {weeklyStudyHours}h
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-[var(--text-secondary)] font-bold">7-Day Study Time</span>
            <div className="text-sm font-serif font-bold text-[var(--text-primary)]">
              Target: {weeklyTarget}h / week
            </div>
          </div>
        </div>

        {/* Metric 4: Registered Subjects */}
        <div className="vintage-card rounded p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-[var(--bg-inset)] border border-[var(--border-color)] text-[var(--text-primary)] flex items-center justify-center font-bold">
            {subjects.length}
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-[var(--text-secondary)] font-bold">Active Courses</span>
            <div className="text-sm font-serif font-bold text-[var(--text-primary)]">
              {settings.currentSemester}
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Study Hours Gauge */}
      <div className="vintage-card rounded p-5 space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[var(--accent)]" />
            <span className="font-serif font-bold text-sm text-[var(--text-primary)]">
              Weekly Study Goal ({weeklyStudyHours} / {weeklyTarget} Hours)
            </span>
          </div>
          <span className="font-bold text-[var(--accent)]">{studyTargetProgress}%</span>
        </div>

        <div className="w-full h-3 rounded-full bg-[var(--bg-inset)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 bg-[var(--accent)]"
            style={{ width: `${studyTargetProgress}%` }}
          />
        </div>
        <p className="text-[11px] font-mono text-[var(--text-secondary)]">
          Calculated strictly from your local study logs recorded in the last 7 days.
        </p>
      </div>

      {/* Course-by-Course Progress Breakdown */}
      <div className="vintage-card rounded p-5 space-y-4">
        <h3 className="font-serif font-bold text-base text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2">
          Subject Syllabi Completion Breakdown
        </h3>

        {subjects.length === 0 ? (
          <p className="text-xs font-serif text-[var(--text-secondary)] text-center py-6">
            No subjects added to curriculum.
          </p>
        ) : (
          <div className="space-y-4">
            {subjects.map(sub => {
              const subModules = modules.filter(m => m.subjectId === sub.id);
              let subTotal = 0;
              let subCompleted = 0;
              subModules.forEach(m => {
                m.topics.forEach(t => {
                  subTotal++;
                  if (t.isCompleted) subCompleted++;
                });
              });
              const pct = subTotal === 0 ? 0 : Math.round((subCompleted / subTotal) * 100);

              return (
                <div key={sub.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-serif font-bold text-[var(--text-primary)]">
                      <span>{sub.name}</span>
                      <span className="font-mono text-[10px] text-[var(--text-secondary)]">({sub.code})</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-[var(--accent)]">{pct}% ({subCompleted}/{subTotal} topics)</span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-[var(--bg-inset)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: sub.color || '#B66A3C' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Study Session Log Modal */}
      {isLogSessionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsLogSessionOpen(false)} />
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-modal-title"
            className="relative w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-color)] rounded shadow-2xl overflow-hidden z-10 flex flex-col"
          >
            <div className="p-3 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-surface-elevated)]">
              <h3 id="session-modal-title" className="font-serif font-bold text-sm text-[var(--text-primary)]">
                Log Academic Study Session
              </h3>
              <button onClick={() => setIsLogSessionOpen(false)} className="text-[var(--text-secondary)]" aria-label="Close modal">
                ×
              </button>
            </div>

            <form onSubmit={handleSaveStudySession} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Duration (Minutes) *
                </label>
                <input
                  type="number"
                  min={5}
                  step={5}
                  required
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(Number(e.target.value))}
                  className="w-full p-2 text-xs rounded vintage-input font-mono"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Subject
                </label>
                <select
                  value={sessionSubjectId}
                  onChange={(e) => setSessionSubjectId(e.target.value)}
                  className="w-full p-2 text-xs rounded vintage-input"
                >
                  <option value="">(General / Multiple Subjects)</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Topics Covered / Study Highlights
                </label>
                <textarea
                  rows={3}
                  value={sessionTopics}
                  onChange={(e) => setSessionTopics(e.target.value)}
                  placeholder="e.g. Practiced dynamic programming tree questions, reviewed Cormen chapters 15-16..."
                  className="w-full p-2 text-xs rounded vintage-input"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[var(--border-color)]">
                <button type="button" onClick={() => setIsLogSessionOpen(false)} className="px-3 py-1.5 rounded vintage-btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded vintage-btn-primary text-xs">
                  Record Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
