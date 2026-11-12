import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Download,
  Upload,
  HardDrive,
  ShieldCheck,
  Palette,
  Calendar,
  BookOpen,
  User,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  RefreshCw,
  Archive,
  Trash2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  getStorageEstimate,
  requestPersistentStorage,
  checkPersistentStorage,
  formatBytes,
  db
} from '../../db/database';
import {
  exportFullBackup,
  exportSelectiveBackup,
  inspectBackupFile,
  restoreFromBackup,
  type BackupManifest,
  type BackupData
} from '../../db/backup';
import type JSZip from 'jszip';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, addToast, toggleTheme } = useApp();

  const [activeSection, setActiveSection] = useState<'backup' | 'storage' | 'appearance' | 'scheduler' | 'academic' | 'general' | 'reset'>('backup');

  // Form states
  const [scholarName, setScholarName] = useState(settings.scholarName);
  const [greetingPrefix, setGreetingPrefix] = useState(settings.greetingPrefix);
  const [currentSemester, setCurrentSemester] = useState(settings.currentSemester);
  const [studyTarget, setStudyTarget] = useState(settings.targetStudyHoursWeekly);
  const [timeFormat, setTimeFormat] = useState(settings.timeFormat);
  const [weekStart, setWeekStart] = useState<0 | 1>(settings.weekStartDay);

  // Storage states
  const [storageEstimate, setStorageEstimate] = useState<{ usage: number; quota: number; percentage: number }>({
    usage: 0,
    quota: 0,
    percentage: 0
  });
  const [isPersisted, setIsPersisted] = useState(false);

  // Selective backup checkboxes
  const [selSubjects, setSelSubjects] = useState(true);
  const [selWork, setSelWork] = useState(true);
  const [selNotes, setSelNotes] = useState(true);
  const [selLogs, setSelLogs] = useState(true);
  const [selFiles, setSelFiles] = useState(true);

  // Restore state
  const [isRestoring, setIsRestoring] = useState(false);
  const [inspectedBackup, setInspectedBackup] = useState<{
    manifest: BackupManifest;
    backupData: BackupData;
    rawZip?: JSZip;
  } | null>(null);
  const [restoreStrategy, setRestoreStrategy] = useState<'merge' | 'overwrite'>('merge');

  useEffect(() => {
    getStorageEstimate().then(setStorageEstimate);
    checkPersistentStorage().then(setIsPersisted);
  }, []);

  // Save General & Academic preferences
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      scholarName: scholarName.trim(),
      greetingPrefix: greetingPrefix.trim(),
      currentSemester: currentSemester.trim(),
      targetStudyHoursWeekly: Number(studyTarget),
      timeFormat,
      weekStartDay: weekStart
    });
  };

  // Request Persistent Storage
  const handleRequestPersistence = async () => {
    const granted = await requestPersistentStorage();
    setIsPersisted(granted);
    if (granted) {
      addToast('Browser granted persistent storage privilege!', 'success');
    } else {
      addToast('Storage persistence could not be granted by browser settings.', 'warning');
    }
  };

  // Handle Full Backup
  const handleFullBackup = async () => {
    try {
      addToast('Packing full ZIP archive with binary documents...', 'info');
      await exportFullBackup();
      addToast('Full offline backup generated and saved!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Backup export error';
      addToast(`Backup failed: ${msg}`, 'error');
    }
  };

  // Handle Selective Backup
  const handleSelectiveBackup = async () => {
    try {
      addToast('Generating selective backup...', 'info');
      await exportSelectiveBackup({
        includeSubjects: selSubjects,
        includeCollegeWork: selWork,
        includeNotes: selNotes,
        includeAcademicLogs: selLogs,
        includeFiles: selFiles
      });
      addToast('Selective backup saved!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Selective backup error';
      addToast(`Backup failed: ${msg}`, 'error');
    }
  };

  // Handle File Selection for Restore
  const handleFileSelectForRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const inspected = await inspectBackupFile(file);
    if (!inspected.isValid || !inspected.manifest || !inspected.backupData) {
      addToast(`Invalid backup file: ${inspected.error}`, 'error');
      return;
    }

    setInspectedBackup({
      manifest: inspected.manifest,
      backupData: inspected.backupData,
      rawZip: inspected.rawZip
    });
  };

  // Execute Restore
  const handleExecuteRestore = async () => {
    if (!inspectedBackup) return;

    if (restoreStrategy === 'overwrite') {
      const confirmed = window.confirm(
        'WARNING: Overwrite mode will erase your current local database and replace it completely with the backup. Are you sure you want to proceed?'
      );
      if (!confirmed) return;
    }

    setIsRestoring(true);
    try {
      const result = await restoreFromBackup(
        inspectedBackup.backupData,
        inspectedBackup.rawZip,
        restoreStrategy
      );

      if (result.success) {
        addToast(result.summary, 'success', 5000);
        setInspectedBackup(null);
        getStorageEstimate().then(setStorageEstimate);
      } else {
        addToast(result.summary, 'error', 5000);
      }
    } finally {
      setIsRestoring(false);
    }
  };

  // Dedicated module purge handlers
  const handlePurgeLogs = async () => {
    if (window.confirm('Are you sure you want to delete ALL academic logs permanently?')) {
      await db.academicLogs.clear();
      addToast('All academic logs cleared', 'info');
    }
  };

  const handlePurgeFiles = async () => {
    if (window.confirm('Are you sure you want to delete ALL stored files & documents from your vault?')) {
      await db.files.clear();
      getStorageEstimate().then(setStorageEstimate);
      addToast('All files removed from vault', 'info');
    }
  };

  const handlePurgeNotes = async () => {
    if (window.confirm('Are you sure you want to delete ALL notebook notes and journals?')) {
      await db.notes.clear();
      addToast('All notes cleared', 'info');
    }
  };

  const handlePurgeWork = async () => {
    if (window.confirm('Are you sure you want to delete ALL assignments, lab records and tasks?')) {
      await db.collegeWork.clear();
      addToast('All college work items cleared', 'info');
    }
  };

  const handlePurgeSchedules = async () => {
    if (window.confirm('Are you sure you want to delete ALL calendar events and schedules?')) {
      await db.schedules.clear();
      addToast('All schedule entries cleared', 'info');
    }
  };

  const handlePurgeSubjects = async () => {
    if (window.confirm('Are you sure you want to delete ALL subjects, modules, and syllabi?')) {
      await db.modules.clear();
      await db.subjects.clear();
      addToast('All subjects and modules cleared', 'info');
    }
  };

  const handlePurgeStudySessions = async () => {
    if (window.confirm('Delete all recorded study session logs?')) {
      await db.studySessions.clear();
      addToast('Study session records cleared', 'info');
    }
  };

  const handleFactoryReset = async () => {
    const confirmed = window.confirm(
      'DANGER: Complete Factory Reset will erase EVERYTHING in your ARCHIVE (all subjects, tasks, files, notes, logs, events, history) and reset to an empty vault. Do you want to proceed?'
    );
    if (!confirmed) return;

    await db.transaction('rw', [
      db.subjects,
      db.modules,
      db.collegeWork,
      db.schedules,
      db.notes,
      db.academicLogs,
      db.files,
      db.studySessions,
      db.activityHistory
    ], async () => {
      await db.subjects.clear();
      await db.modules.clear();
      await db.collegeWork.clear();
      await db.schedules.clear();
      await db.notes.clear();
      await db.academicLogs.clear();
      await db.files.clear();
      await db.studySessions.clear();
      await db.activityHistory.clear();
    });

    localStorage.removeItem('archive_scratchpad');
    getStorageEstimate().then(setStorageEstimate);
    addToast('Vault completely reset to empty state', 'success', 5000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div className="border-b border-[var(--border-color)] pb-4">
        <span className="text-xs font-mono uppercase tracking-wider text-[var(--accent)] font-bold">
          System Configuration & Data Ownership
        </span>
        <h1 className="text-2xl font-serif font-bold text-[var(--text-primary)]">
          Settings & Local Vault Manager
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Navigation Sidebar (3 cols) */}
        <div className="lg:col-span-3 space-y-1 font-mono text-xs">
          {[
            { id: 'backup', label: 'Backup & Restore', icon: Archive, desc: 'ZIP Export & Import' },
            { id: 'storage', label: 'Local Storage Quota', icon: HardDrive, desc: 'Browser IndexedDB Vault' },
            { id: 'appearance', label: 'Aesthetics & Theme', icon: Palette, desc: 'Parchment & Dark' },
            { id: 'scheduler', label: 'Scheduler Settings', icon: Calendar, desc: '12/24h & Week start' },
            { id: 'academic', label: 'Curriculum & Semester', icon: BookOpen, desc: 'Semester targets' },
            { id: 'general', label: 'General Identity', icon: User, desc: 'Scholar Name' },
            { id: 'reset', label: 'Vault Purge & Reset', icon: Trash2, desc: 'Clear records & fresh start' },
          ].map(sec => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;

            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id as typeof activeSection)}
                className={`w-full p-2.5 rounded text-left flex items-start gap-3 transition-colors border ${
                  isActive
                    ? 'bg-[var(--text-primary)] text-[var(--bg-surface)] border-[var(--text-primary)] font-bold'
                    : 'vintage-card hover:bg-[var(--bg-inset)]/40 text-[var(--text-primary)]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`} />
                <div>
                  <div>{sec.label}</div>
                  <div className={`text-[10px] font-normal ${isActive ? 'text-[var(--bg-surface)]/70' : 'text-[var(--text-secondary)]'}`}>
                    {sec.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Settings Body (9 cols) */}
        <div className="lg:col-span-9 space-y-6">
          {/* Section: BACKUP & RESTORATION (CRITICAL) */}
          {activeSection === 'backup' && (
            <div className="space-y-6">
              {/* Full Backup Card */}
              <div className="vintage-card rounded p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-serif font-bold text-lg text-[var(--text-primary)]">
                      Full Vault Backup (ZIP Archive)
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] font-body mt-1 max-w-xl">
                      Packages your complete academic records — including subjects, syllabi, notes, academic logs, calendar events, and all binary files (PDFs, images, documents) into a standalone versioned ZIP archive.
                    </p>
                  </div>
                  <button
                    onClick={handleFullBackup}
                    className="px-4 py-2 rounded vintage-btn-primary flex items-center gap-2 text-xs font-mono shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Full Backup (.ZIP)</span>
                  </button>
                </div>

                <div className="p-3 rounded bg-[var(--bg-inset)]/30 border border-[var(--border-color)] text-xs font-mono text-[var(--text-secondary)] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[var(--accent-olive)] shrink-0" />
                  <span>
                    100% Offline: Generates the ZIP file entirely in your browser without contacting any external servers.
                  </span>
                </div>
              </div>

              {/* Selective Backup Card */}
              <div className="vintage-card rounded p-6 space-y-4">
                <h3 className="font-serif font-bold text-base text-[var(--text-primary)]">
                  Selective Module Export
                </h3>
                <p className="text-xs text-[var(--text-secondary)] font-body">
                  Export specific modules when you only need to back up certain records:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={selSubjects} onChange={(e) => setSelSubjects(e.target.checked)} className="accent-[var(--accent)]" />
                    <span>Subjects & Syllabi</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={selWork} onChange={(e) => setSelWork(e.target.checked)} className="accent-[var(--accent)]" />
                    <span>College Work</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={selNotes} onChange={(e) => setSelNotes(e.target.checked)} className="accent-[var(--accent)]" />
                    <span>Notes & Journal</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={selLogs} onChange={(e) => setSelLogs(e.target.checked)} className="accent-[var(--accent)]" />
                    <span>Academic Logs</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={selFiles} onChange={(e) => setSelFiles(e.target.checked)} className="accent-[var(--accent)]" />
                    <span>Stored Binary Files</span>
                  </label>
                </div>

                <button
                  onClick={handleSelectiveBackup}
                  className="px-4 py-1.5 rounded vintage-btn-secondary text-xs font-mono inline-flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Selective Archive</span>
                </button>
              </div>

              {/* Restoration Card */}
              <div className="vintage-card rounded p-6 space-y-4 border-2 border-[var(--border-color)]">
                <div>
                  <h3 className="font-serif font-bold text-lg text-[var(--text-primary)]">
                    Restore Archive from Backup (.ZIP / .JSON)
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] font-body mt-1">
                    Select a previously exported ARCHIVE backup file to inspect and restore your collegiate data.
                  </p>
                </div>

                {/* Upload Picker */}
                <input
                  type="file"
                  accept=".zip,.json"
                  onChange={handleFileSelectForRestore}
                  className="w-full text-xs font-mono file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-mono file:bg-[var(--text-primary)] file:text-[var(--bg-surface)] hover:file:bg-[var(--accent)]"
                />

                {/* Inspected Backup Preview Box */}
                {inspectedBackup && (
                  <div className="p-4 rounded border border-[var(--accent)] bg-[var(--bg-surface-elevated)] space-y-3">
                    <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-[var(--accent)]" />
                        <span className="font-serif font-bold text-sm text-[var(--text-primary)]">
                          Valid Backup Archive Verified
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                        Date: {inspectedBackup.manifest.exportDate}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                      <div>Subjects: <strong>{inspectedBackup.manifest.counts.subjects}</strong></div>
                      <div>Work Items: <strong>{inspectedBackup.manifest.counts.collegeWork}</strong></div>
                      <div>Notes: <strong>{inspectedBackup.manifest.counts.notes}</strong></div>
                      <div>Academic Logs: <strong>{inspectedBackup.manifest.counts.academicLogs}</strong></div>
                      <div>Binary Files: <strong>{inspectedBackup.manifest.counts.files}</strong></div>
                    </div>

                    {/* Restore Strategy Selection */}
                    <div className="pt-2 border-t border-[var(--border-color)]">
                      <span className="block text-xs font-mono font-bold text-[var(--text-secondary)] mb-1">
                        Restoration Strategy:
                      </span>
                      <div className="flex flex-col sm:flex-row gap-4 text-xs font-mono">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="strategy"
                            value="merge"
                            checked={restoreStrategy === 'merge'}
                            onChange={() => setRestoreStrategy('merge')}
                            className="accent-[var(--accent)]"
                          />
                          <span>Safe Merge (Keep existing records, insert new)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-[var(--accent-red)]">
                          <input
                            type="radio"
                            name="strategy"
                            value="overwrite"
                            checked={restoreStrategy === 'overwrite'}
                            onChange={() => setRestoreStrategy('overwrite')}
                            className="accent-[var(--accent-red)]"
                          />
                          <span>Clean Overwrite (Replace entire database)</span>
                        </label>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setInspectedBackup(null)}
                        className="px-3 py-1.5 rounded vintage-btn-secondary text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isRestoring}
                        onClick={handleExecuteRestore}
                        className="px-4 py-1.5 rounded vintage-btn-primary text-xs font-bold"
                      >
                        {isRestoring ? 'Restoring records...' : 'Confirm & Restore Vault'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section: Storage Quota */}
          {activeSection === 'storage' && (
            <div className="vintage-card rounded p-6 space-y-6">
              <h3 className="font-serif font-bold text-lg text-[var(--text-primary)]">
                Device Storage Vault & Persistent Storage
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span>IndexedDB Vault Usage: {formatBytes(storageEstimate.usage)}</span>
                  <span>Available Browser Quota: {formatBytes(storageEstimate.quota)}</span>
                </div>
                <div className="w-full h-3 rounded-full bg-[var(--bg-inset)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--accent)]"
                    style={{ width: `${Math.max(1, storageEstimate.percentage)}%` }}
                  />
                </div>
              </div>

              {/* Persistence Status */}
              <div className="p-4 rounded bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`w-4 h-4 ${isPersisted ? 'text-[var(--accent-olive)]' : 'text-[var(--accent)]'}`} />
                    <span className="font-serif font-bold text-sm text-[var(--text-primary)]">
                      Persistent Storage Status: {isPersisted ? 'Granted & Protected' : 'Default (Opportunistic)'}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] font-body mt-1">
                    {isPersisted
                      ? 'The browser has granted persistent storage. The device will not automatically evict your academic data under storage pressure.'
                      : 'Request persistent storage so the browser will never clear IndexedDB even if device disk is low.'}
                  </p>
                </div>

                {!isPersisted && (
                  <button
                    onClick={handleRequestPersistence}
                    className="px-3 py-1.5 rounded vintage-btn-primary text-xs font-mono shrink-0"
                  >
                    Request Persistence
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Section: Appearance & Theme */}
          {activeSection === 'appearance' && (
            <div className="vintage-card rounded p-6 space-y-6">
              <h3 className="font-serif font-bold text-lg text-[var(--text-primary)]">
                Visual Aesthetic & Palette
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-2">
                    Theme Scheme
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                      onClick={() => updateSettings({ theme: 'vintage-light' })}
                      className={`p-4 rounded border cursor-pointer transition-all ${
                        settings.theme === 'vintage-light'
                          ? 'border-[var(--accent)] bg-[#F4EBDD] text-[#382A20] shadow-md ring-2 ring-[var(--accent)]/30'
                          : 'border-[var(--border-color)] bg-[#F4EBDD]/60 text-[#382A20]'
                      }`}
                    >
                      <h4 className="font-serif font-bold text-sm">Vintage Aged Paper (Light)</h4>
                      <p className="text-xs font-body mt-1 opacity-80">
                        Traditional university library aesthetic with warm cream and aged parchment.
                      </p>
                    </div>

                    <div
                      onClick={() => updateSettings({ theme: 'vintage-dark' })}
                      className={`p-4 rounded border cursor-pointer transition-all ${
                        settings.theme === 'vintage-dark'
                          ? 'border-[var(--accent)] bg-[#271F1A] text-[#EDE4D6] shadow-md ring-2 ring-[var(--accent)]/30'
                          : 'border-[#4D3D33] bg-[#271F1A]/60 text-[#EDE4D6]'
                      }`}
                    >
                      <h4 className="font-serif font-bold text-sm">Dark Leather Library (Dark)</h4>
                      <p className="text-xs font-body mt-1 opacity-80">
                        Deep sepia, walnut leather and brass accents for low-light night study.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-3">
                    {['#B66A3C', '#72734B', '#66503B', '#A44F42', '#382A20'].map(color => (
                      <button
                        key={color}
                        onClick={() => updateSettings({ accentColor: color })}
                        className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                          settings.accentColor === color ? 'border-[var(--text-primary)] scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section: Scheduler */}
          {activeSection === 'scheduler' && (
            <div className="vintage-card rounded p-6 space-y-4">
              <h3 className="font-serif font-bold text-lg text-[var(--text-primary)]">
                Scheduler & Calendar Preferences
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <label className="block font-medium text-[var(--text-secondary)] mb-1">
                    Clock Format
                  </label>
                  <select
                    value={timeFormat}
                    onChange={(e) => {
                      const tf = e.target.value as '12h' | '24h';
                      setTimeFormat(tf);
                      updateSettings({ timeFormat: tf });
                    }}
                    className="w-full p-2 rounded vintage-input"
                  >
                    <option value="12h">12-Hour Clock (e.g. 2:30 PM)</option>
                    <option value="24h">24-Hour Clock (e.g. 14:30)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[var(--text-secondary)] mb-1">
                    Week Starts On
                  </label>
                  <select
                    value={weekStart}
                    onChange={(e) => {
                      const ws = Number(e.target.value) as 0 | 1;
                      setWeekStart(ws);
                      updateSettings({ weekStartDay: ws });
                    }}
                    className="w-full p-2 rounded vintage-input"
                  >
                    <option value={1}>Monday</option>
                    <option value={0}>Sunday</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Section: Academic Settings */}
          {activeSection === 'academic' && (
            <form onSubmit={handleSaveGeneral} className="vintage-card rounded p-6 space-y-4">
              <h3 className="font-serif font-bold text-lg text-[var(--text-primary)]">
                Academic Curriculum & Semester
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Current Semester / Academic Term
                  </label>
                  <input
                    type="text"
                    value={currentSemester}
                    onChange={(e) => setCurrentSemester(e.target.value)}
                    placeholder="e.g. Semester V, Fall 2026"
                    className="w-full p-2 text-xs rounded vintage-input font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Target Weekly Study Hours
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={80}
                    value={studyTarget}
                    onChange={(e) => setStudyTarget(Number(e.target.value))}
                    className="w-full p-2 text-xs rounded vintage-input font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button type="submit" className="px-4 py-2 rounded vintage-btn-primary text-xs font-mono">
                  Save Academic Preferences
                </button>
              </div>
            </form>
          )}

          {/* Section: General Identity */}
          {activeSection === 'general' && (
            <form onSubmit={handleSaveGeneral} className="vintage-card rounded p-6 space-y-4">
              <h3 className="font-serif font-bold text-lg text-[var(--text-primary)]">
                Scholar Identity & Workspace Greeting
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Scholar Name / Title
                  </label>
                  <input
                    type="text"
                    value={scholarName}
                    onChange={(e) => setScholarName(e.target.value)}
                    placeholder="Scholar"
                    className="w-full p-2 text-xs rounded vintage-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Greeting Prefix
                  </label>
                  <input
                    type="text"
                    value={greetingPrefix}
                    onChange={(e) => setGreetingPrefix(e.target.value)}
                    placeholder="Welcome to your Archive,"
                    className="w-full p-2 text-xs rounded vintage-input font-body italic"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button type="submit" className="px-4 py-2 rounded vintage-btn-primary text-xs font-mono">
                  Save Identity
                </button>
              </div>
            </form>
          )}

          {/* Section: Vault Purge & Reset */}
          {activeSection === 'reset' && (
            <div className="vintage-card rounded p-6 space-y-6">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--accent-red)] font-bold">
                  Data Removal & Vault Purge
                </span>
                <h3 className="font-serif font-bold text-xl text-[var(--text-primary)] mt-0.5">
                  Delete Records & Reset Archive
                </h3>
                <p className="text-xs text-[var(--text-secondary)] font-body mt-1 max-w-xl">
                  You have complete ownership of your local vault. Select any specific module below to purge its records immediately, or perform a complete factory reset to begin with a blank slate.
                </p>
              </div>

              {/* Individual Module Purge Buttons */}
              <div className="space-y-3 pt-2 border-t border-[var(--border-color)]">
                <h4 className="font-serif font-bold text-sm text-[var(--text-primary)]">
                  Individual Module Purge
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded border border-[var(--border-color)] bg-[var(--bg-surface-elevated)] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-serif font-bold text-[var(--text-primary)]">Academic Logs</div>
                      <div className="text-[10px] font-mono text-[var(--text-secondary)]">Clear all laboratory & study logs</div>
                    </div>
                    <button
                      onClick={handlePurgeLogs}
                      className="px-2.5 py-1 rounded vintage-btn-secondary text-[var(--accent-red)] text-xs font-mono flex items-center gap-1 hover:border-[var(--accent-red)]"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete All</span>
                    </button>
                  </div>

                  <div className="p-3 rounded border border-[var(--border-color)] bg-[var(--bg-surface-elevated)] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-serif font-bold text-[var(--text-primary)]">Digital Files & PDFs</div>
                      <div className="text-[10px] font-mono text-[var(--text-secondary)]">Purge all binary blobs from vault</div>
                    </div>
                    <button
                      onClick={handlePurgeFiles}
                      className="px-2.5 py-1 rounded vintage-btn-secondary text-[var(--accent-red)] text-xs font-mono flex items-center gap-1 hover:border-[var(--accent-red)]"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete All</span>
                    </button>
                  </div>

                  <div className="p-3 rounded border border-[var(--border-color)] bg-[var(--bg-surface-elevated)] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-serif font-bold text-[var(--text-primary)]">Notes & Journal Entries</div>
                      <div className="text-[10px] font-mono text-[var(--text-secondary)]">Clear all notebook parchment pages</div>
                    </div>
                    <button
                      onClick={handlePurgeNotes}
                      className="px-2.5 py-1 rounded vintage-btn-secondary text-[var(--accent-red)] text-xs font-mono flex items-center gap-1 hover:border-[var(--accent-red)]"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete All</span>
                    </button>
                  </div>

                  <div className="p-3 rounded border border-[var(--border-color)] bg-[var(--bg-surface-elevated)] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-serif font-bold text-[var(--text-primary)]">College Work & Tasks</div>
                      <div className="text-[10px] font-mono text-[var(--text-secondary)]">Clear assignments, labs & projects</div>
                    </div>
                    <button
                      onClick={handlePurgeWork}
                      className="px-2.5 py-1 rounded vintage-btn-secondary text-[var(--accent-red)] text-xs font-mono flex items-center gap-1 hover:border-[var(--accent-red)]"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete All</span>
                    </button>
                  </div>

                  <div className="p-3 rounded border border-[var(--border-color)] bg-[var(--bg-surface-elevated)] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-serif font-bold text-[var(--text-primary)]">Schedules & Timetable</div>
                      <div className="text-[10px] font-mono text-[var(--text-secondary)]">Clear all calendar routines & events</div>
                    </div>
                    <button
                      onClick={handlePurgeSchedules}
                      className="px-2.5 py-1 rounded vintage-btn-secondary text-[var(--accent-red)] text-xs font-mono flex items-center gap-1 hover:border-[var(--accent-red)]"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete All</span>
                    </button>
                  </div>

                  <div className="p-3 rounded border border-[var(--border-color)] bg-[var(--bg-surface-elevated)] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-serif font-bold text-[var(--text-primary)]">Subjects & Syllabi</div>
                      <div className="text-[10px] font-mono text-[var(--text-secondary)]">Clear all registered course subjects</div>
                    </div>
                    <button
                      onClick={handlePurgeSubjects}
                      className="px-2.5 py-1 rounded vintage-btn-secondary text-[var(--accent-red)] text-xs font-mono flex items-center gap-1 hover:border-[var(--accent-red)]"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete All</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Complete Factory Reset */}
              <div className="p-4 rounded border-2 border-[var(--accent-red)]/50 bg-[var(--accent-red)]/5 space-y-3">
                <div className="flex items-center gap-2 text-[var(--accent-red)] font-serif font-bold text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Factory Reset Vault (Clean Slate)</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] font-body">
                  Permanently empties your local IndexedDB database across all tables. All demo seed data and existing records will be deleted, leaving an empty, pristine personal archive for your college career.
                </p>
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleFactoryReset}
                    className="px-4 py-2 rounded bg-[var(--accent-red)] text-white hover:opacity-90 font-mono text-xs font-bold flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Wipe Entire Vault to Empty State</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
