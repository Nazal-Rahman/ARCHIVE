import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { db, logActivity } from './database';
import type {
  Subject,
  Module,
  CollegeWork,
  ScheduleEvent,
  Note,
  AcademicLog,
  FileItem,
  StudySession,
  AppSettings
} from './types';

export interface BackupManifest {
  appName: string;
  version: string;
  timestamp: number;
  exportDate: string;
  type: 'full' | 'selective';
  counts: {
    subjects: number;
    modules: number;
    collegeWork: number;
    schedules: number;
    notes: number;
    academicLogs: number;
    files: number;
    studySessions: number;
  };
}

export interface BackupData {
  manifest: BackupManifest;
  subjects?: Subject[];
  modules?: Module[];
  collegeWork?: CollegeWork[];
  schedules?: ScheduleEvent[];
  notes?: Note[];
  academicLogs?: AcademicLog[];
  filesMetadata?: Omit<FileItem, 'blob'>[];
  studySessions?: StudySession[];
  settings?: AppSettings;
}

// Full Backup: Generates a ZIP with database.json + individual binary files
export async function exportFullBackup(): Promise<void> {
  const zip = new JSZip();
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  const subjects = await db.subjects.toArray();
  const modules = await db.modules.toArray();
  const collegeWork = await db.collegeWork.toArray();
  const schedules = await db.schedules.toArray();
  const notes = await db.notes.toArray();
  const academicLogs = await db.academicLogs.toArray();
  const rawFiles = await db.files.toArray();
  const studySessions = await db.studySessions.toArray();
  const settingsList = await db.settings.toArray();
  const settings = settingsList[0];

  const manifest: BackupManifest = {
    appName: 'ARCHIVE',
    version: '1.0.0',
    timestamp: Date.now(),
    exportDate: dateStr,
    type: 'full',
    counts: {
      subjects: subjects.length,
      modules: modules.length,
      collegeWork: collegeWork.length,
      schedules: schedules.length,
      notes: notes.length,
      academicLogs: academicLogs.length,
      files: rawFiles.length,
      studySessions: studySessions.length,
    }
  };

  // Strip blobs from metadata JSON, will put actual binary blobs in /files/ directory in zip
  const filesMetadata = rawFiles.map(f => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { blob, ...rest } = f;
    return rest;
  });

  const backupData: BackupData = {
    manifest,
    subjects,
    modules,
    collegeWork,
    schedules,
    notes,
    academicLogs,
    filesMetadata,
    studySessions,
    settings
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('database.json', JSON.stringify(backupData, null, 2));

  // Store binary blobs in files/ folder
  const filesFolder = zip.folder('files');
  if (filesFolder) {
    for (const f of rawFiles) {
      if (f.blob) {
        filesFolder.file(f.id, f.blob);
      }
    }
  }

  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  const filename = `ARCHIVE_Backup_${dateStr}.zip`;
  saveAs(content, filename);
  await logActivity('backup', 'backup', `Exported full backup (${filename})`);
}

// Selective Backup: Export individual module or selected tables
export async function exportSelectiveBackup(options: {
  includeSubjects?: boolean;
  includeCollegeWork?: boolean;
  includeNotes?: boolean;
  includeAcademicLogs?: boolean;
  includeFiles?: boolean;
}): Promise<void> {
  const zip = new JSZip();
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  const subjects = options.includeSubjects ? await db.subjects.toArray() : [];
  const modules = options.includeSubjects ? await db.modules.toArray() : [];
  const collegeWork = options.includeCollegeWork ? await db.collegeWork.toArray() : [];
  const notes = options.includeNotes ? await db.notes.toArray() : [];
  const academicLogs = options.includeAcademicLogs ? await db.academicLogs.toArray() : [];
  const rawFiles = options.includeFiles ? await db.files.toArray() : [];

  const manifest: BackupManifest = {
    appName: 'ARCHIVE',
    version: '1.0.0',
    timestamp: Date.now(),
    exportDate: dateStr,
    type: 'selective',
    counts: {
      subjects: subjects.length,
      modules: modules.length,
      collegeWork: collegeWork.length,
      schedules: 0,
      notes: notes.length,
      academicLogs: academicLogs.length,
      files: rawFiles.length,
      studySessions: 0,
    }
  };

  const filesMetadata = rawFiles.map(f => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { blob, ...rest } = f;
    return rest;
  });

  const backupData: BackupData = {
    manifest,
    subjects: options.includeSubjects ? subjects : undefined,
    modules: options.includeSubjects ? modules : undefined,
    collegeWork: options.includeCollegeWork ? collegeWork : undefined,
    notes: options.includeNotes ? notes : undefined,
    academicLogs: options.includeAcademicLogs ? academicLogs : undefined,
    filesMetadata: options.includeFiles ? filesMetadata : undefined,
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('database.json', JSON.stringify(backupData, null, 2));

  if (options.includeFiles && rawFiles.length > 0) {
    const filesFolder = zip.folder('files');
    if (filesFolder) {
      for (const f of rawFiles) {
        if (f.blob) {
          filesFolder.file(f.id, f.blob);
        }
      }
    }
  }

  const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const filename = `ARCHIVE_Selective_${dateStr}.zip`;
  saveAs(content, filename);
  await logActivity('backup', 'backup', `Exported selective backup (${filename})`);
}

// Read and Inspect a backup file before importing
export async function inspectBackupFile(file: File): Promise<{
  isValid: boolean;
  manifest?: BackupManifest;
  backupData?: BackupData;
  rawZip?: JSZip;
  error?: string;
}> {
  try {
    if (file.name.endsWith('.zip')) {
      const zip = await JSZip.loadAsync(file);
      const dbFile = zip.file('database.json');
      if (!dbFile) {
        return { isValid: false, error: 'Invalid ARCHIVE backup: missing database.json' };
      }
      const jsonText = await dbFile.async('text');
      const backupData = JSON.parse(jsonText) as BackupData;
      if (!backupData.manifest || backupData.manifest.appName !== 'ARCHIVE') {
        return { isValid: false, error: 'File is not a valid ARCHIVE backup archive.' };
      }
      return {
        isValid: true,
        manifest: backupData.manifest,
        backupData,
        rawZip: zip
      };
    } else if (file.name.endsWith('.json')) {
      const text = await file.text();
      const backupData = JSON.parse(text) as BackupData;
      if (!backupData.manifest || backupData.manifest.appName !== 'ARCHIVE') {
        return { isValid: false, error: 'File is not a valid ARCHIVE JSON backup.' };
      }
      return {
        isValid: true,
        manifest: backupData.manifest,
        backupData
      };
    } else {
      return { isValid: false, error: 'Unsupported file type. Please provide a .zip or .json backup.' };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Corrupted or unreadable backup file';
    return { isValid: false, error: message };
  }
}

// Restore backup with either "merge" or "overwrite" mode
export async function restoreFromBackup(
  backupData: BackupData,
  rawZip?: JSZip,
  strategy: 'merge' | 'overwrite' = 'merge'
): Promise<{ success: boolean; summary: string }> {
  try {
    if (strategy === 'overwrite') {
      // Clear current data safely
      await db.transaction('rw', [
        db.subjects,
        db.modules,
        db.collegeWork,
        db.schedules,
        db.notes,
        db.academicLogs,
        db.files,
        db.studySessions,
        db.settings
      ], async () => {
        await db.subjects.clear();
        await db.modules.clear();
        await db.collegeWork.clear();
        await db.schedules.clear();
        await db.notes.clear();
        await db.academicLogs.clear();
        await db.files.clear();
        await db.studySessions.clear();
      });
    }

    // Restore tables
    if (backupData.subjects && backupData.subjects.length > 0) {
      await db.subjects.bulkPut(backupData.subjects);
    }
    if (backupData.modules && backupData.modules.length > 0) {
      await db.modules.bulkPut(backupData.modules);
    }
    if (backupData.collegeWork && backupData.collegeWork.length > 0) {
      await db.collegeWork.bulkPut(backupData.collegeWork);
    }
    if (backupData.schedules && backupData.schedules.length > 0) {
      await db.schedules.bulkPut(backupData.schedules);
    }
    if (backupData.notes && backupData.notes.length > 0) {
      await db.notes.bulkPut(backupData.notes);
    }
    if (backupData.academicLogs && backupData.academicLogs.length > 0) {
      await db.academicLogs.bulkPut(backupData.academicLogs);
    }
    if (backupData.studySessions && backupData.studySessions.length > 0) {
      await db.studySessions.bulkPut(backupData.studySessions);
    }
    if (backupData.settings) {
      await db.settings.put(backupData.settings);
    }

    // Restore binary files if present
    let restoredFilesCount = 0;
    if (backupData.filesMetadata && backupData.filesMetadata.length > 0) {
      const filesToPut: FileItem[] = [];
      for (const meta of backupData.filesMetadata) {
        let fileBlob: Blob | undefined;
        if (rawZip) {
          const zippedFile = rawZip.file(`files/${meta.id}`);
          if (zippedFile) {
            fileBlob = await zippedFile.async('blob');
          }
        }
        if (!fileBlob) {
          // Fallback empty blob if binary was not included
          fileBlob = new Blob([''], { type: meta.mimeType || 'application/octet-stream' });
        }
        filesToPut.push({
          ...meta,
          blob: fileBlob
        });
        restoredFilesCount++;
      }
      if (filesToPut.length > 0) {
        await db.files.bulkPut(filesToPut);
      }
    }

    const summary = `Restored successfully (${strategy} mode): ${backupData.subjects?.length || 0} subjects, ${backupData.collegeWork?.length || 0} work items, ${backupData.notes?.length || 0} notes, ${backupData.academicLogs?.length || 0} logs, ${restoredFilesCount} files.`;

    await logActivity('backup', 'backup', summary);
    return { success: true, summary };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Restoration error';
    return { success: false, summary: `Restoration failed: ${message}` };
  }
}
