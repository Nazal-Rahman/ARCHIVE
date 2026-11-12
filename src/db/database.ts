import Dexie, { type Table } from 'dexie';
import type {
  Subject,
  Module,
  CollegeWork,
  ScheduleEvent,
  Note,
  AcademicLog,
  FileItem,
  StudySession,
  ActivityHistory,
  AppSettings,
  DashboardWidgetConfig
} from './types';

export const DEFAULT_WIDGETS: DashboardWidgetConfig[] = [
  { id: 'today_schedule', name: "Today's Timetable", enabled: true, order: 1 },
  { id: 'pending_tasks', name: 'Pending Tasks & Deadlines', enabled: true, order: 2 },
  { id: 'subject_progress', name: 'Subject Academic Progress', enabled: true, order: 3 },
  { id: 'weekly_study', name: 'Weekly Study Tracker', enabled: true, order: 4 },
  { id: 'recent_logs', name: 'Recent Academic Logs', enabled: true, order: 5 },
  { id: 'quick_notes', name: 'Scratchpad & Quick Notes', enabled: true, order: 6 },
  { id: 'recent_files', name: 'Recent Digital Library Files', enabled: true, order: 7 },
  { id: 'upcoming_exams', name: 'Examination Countdown', enabled: true, order: 8 },
  { id: 'productivity_stats', name: 'Academic Productivity Index', enabled: true, order: 9 },
  { id: 'quick_actions', name: 'Desk Quick Tools', enabled: true, order: 10 },
];

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'current_settings',
  scholarName: 'Scholar',
  greetingPrefix: 'Welcome to your Archive,',
  theme: 'vintage-light',
  accentColor: '#B66A3C',
  fontScale: 'normal',
  timeFormat: '12h',
  weekStartDay: 1, // Monday
  currentSemester: 'Semester V',
  targetStudyHoursWeekly: 25,
  sidebarCollapsed: false,
  defaultLandingPage: 'dashboard',
  dashboardWidgets: DEFAULT_WIDGETS,
  updatedAt: Date.now(),
};

export class ArchiveDatabase extends Dexie {
  subjects!: Table<Subject, string>;
  modules!: Table<Module, string>;
  collegeWork!: Table<CollegeWork, string>;
  schedules!: Table<ScheduleEvent, string>;
  notes!: Table<Note, string>;
  academicLogs!: Table<AcademicLog, string>;
  files!: Table<FileItem, string>;
  studySessions!: Table<StudySession, string>;
  activityHistory!: Table<ActivityHistory, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('ArchiveAcademicDB');

    // Schema version 1
    this.version(1).stores({
      subjects: 'id, name, code, semester, isArchived, createdAt, updatedAt',
      modules: 'id, subjectId, orderIndex, isCompleted, createdAt',
      collegeWork: 'id, subjectId, category, dueDate, priority, status, createdAt',
      schedules: 'id, date, startTime, category, priority, subjectId, isCompleted, recurrence',
      notes: 'id, subjectId, category, isFavorite, isPinned, createdAt, updatedAt',
      academicLogs: 'id, logNumber, date, category, subjectId, relatedWorkId, createdAt',
      files: 'id, category, uploadDate, fileSize, subjectId, relatedWorkId, relatedLogId, isFavorite',
      studySessions: 'id, subjectId, date, createdAt',
      activityHistory: 'id, action, entityType, timestamp',
      settings: 'id'
    });
  }
}

export const db = new ArchiveDatabase();

// Activity Logging helper
export async function logActivity(
  action: ActivityHistory['action'],
  entityType: ActivityHistory['entityType'],
  entityTitle: string,
  entityId?: string,
  details?: string
) {
  try {
    await db.activityHistory.add({
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      action,
      entityType,
      entityId,
      entityTitle,
      timestamp: Date.now(),
      details
    });
  } catch (err) {
    console.warn('Could not record activity history:', err);
  }
}

// Storage Helpers
export async function getStorageEstimate() {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        percentage: estimate.quota ? Math.round(((estimate.usage || 0) / estimate.quota) * 100) : 0
      };
    } catch {
      return { usage: 0, quota: 0, percentage: 0 };
    }
  }
  return { usage: 0, quota: 0, percentage: 0 };
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    try {
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }
  return false;
}

export async function checkPersistentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persisted) {
    try {
      return await navigator.storage.persisted();
    } catch {
      return false;
    }
  }
  return false;
}

// Format bytes
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Initial Database Seeding with realistic academic data
export async function initializeDatabaseSeed() {
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.put(DEFAULT_SETTINGS);
  }

  const subjectsCount = await db.subjects.count();
  if (subjectsCount === 0) {
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(now + 86400000).toISOString().split('T')[0];
    const nextWeek = new Date(now + 7 * 86400000).toISOString().split('T')[0];

    // Seed Subjects
    const sub1: Subject = {
      id: 'sub_algo',
      name: 'Algorithms & Data Structures',
      code: 'CS-301',
      semester: 'Semester V',
      credits: 4,
      description: 'Advanced graph algorithms, dynamic programming, tree traversals, and amortized complexity analysis.',
      color: '#B66A3C', // Burnt Orange
      instructor: {
        name: 'Dr. Arthur Pendelton',
        email: 'a.pendelton@university.edu',
        office: 'Faculty Wing Room 412',
        notes: 'Office hours on Tuesdays and Thursdays 2-4 PM'
      },
      syllabus: 'Unit I: Asymptotic Analysis & Recurrences\nUnit II: Advanced Balanced Search Trees\nUnit III: Graph Algorithms (Shortest Paths, Flow Networks)\nUnit IV: Dynamic Programming Paradigms',
      tags: ['Core', 'Theory', 'Programming'],
      isArchived: false,
      createdAt: now - 30 * 86400000,
      updatedAt: now - 2 * 86400000
    };

    const sub2: Subject = {
      id: 'sub_os',
      name: 'Operating Systems & Architecture',
      code: 'CS-304',
      semester: 'Semester V',
      credits: 4,
      description: 'Kernel architectures, concurrent process synchronization, virtual memory management, and file systems.',
      color: '#72734B', // Olive Green
      instructor: {
        name: 'Prof. Eleanor Vance',
        email: 'e.vance@university.edu',
        office: 'Lab Building B-12'
      },
      syllabus: 'Unit I: System Calls & Kernel Design\nUnit II: Process Scheduling & Concurrency\nUnit III: Memory Virtualization & Paging\nUnit IV: File Systems & Storage Hierarchy',
      tags: ['Systems', 'Core'],
      isArchived: false,
      createdAt: now - 30 * 86400000,
      updatedAt: now - 5 * 86400000
    };

    const sub3: Subject = {
      id: 'sub_dbms',
      name: 'Database Management Systems',
      code: 'CS-307',
      semester: 'Semester V',
      credits: 3,
      description: 'Relational algebra, normal forms, transaction ACID properties, B+ Tree indexing, and query optimization.',
      color: '#66503B', // Coffee Brown
      instructor: {
        name: 'Dr. Marcus Sterling',
        email: 'm.sterling@university.edu',
        office: 'Tech Hall 205'
      },
      syllabus: 'Unit I: Relational Model & Schema Design\nUnit II: Normalization & Functional Dependencies\nUnit III: Transactions & Concurrency Control\nUnit IV: Indexing & Query Execution',
      tags: ['Data', 'Practical'],
      isArchived: false,
      createdAt: now - 30 * 86400000,
      updatedAt: now - 1 * 86400000
    };

    await db.subjects.bulkAdd([sub1, sub2, sub3]);

    // Seed Modules
    const mod1: Module = {
      id: 'mod_algo_1',
      subjectId: 'sub_algo',
      name: 'Module 1: Dynamic Programming & Memoization',
      orderIndex: 1,
      description: 'Optimal substructure, overlapping subproblems, knapsack problems, and matrix chain multiplication.',
      topics: [
        { id: 'top_1', title: 'Top-down vs Bottom-up Memoization', isCompleted: true },
        { id: 'top_2', title: '0/1 Knapsack & Fractional Variants', isCompleted: true },
        { id: 'top_3', title: 'Longest Common Subsequence (LCS)', isCompleted: false },
        { id: 'top_4', title: 'Bellman-Ford Dynamic Formulation', isCompleted: false },
      ],
      isCompleted: false,
      notes: 'Review recurrence relations from Cormen chapters 15 and 16.',
      attachmentIds: [],
      links: [
        { title: 'MIT OpenCourseWare DP Lecture', url: 'https://ocw.mit.edu' }
      ],
      createdAt: now - 20 * 86400000,
      updatedAt: now
    };

    const mod2: Module = {
      id: 'mod_os_1',
      subjectId: 'sub_os',
      name: 'Module 1: Concurrency & Semaphores',
      orderIndex: 1,
      description: 'Race conditions, critical sections, Mutex locks, Peterson’s algorithm, and Dining Philosophers problem.',
      topics: [
        { id: 'top_5', title: 'Critical Section Requirements', isCompleted: true },
        { id: 'top_6', title: 'Counting Semaphores & Binary Mutex', isCompleted: true },
        { id: 'top_7', title: 'Deadlock Characterization & Prevention', isCompleted: true },
      ],
      isCompleted: true,
      notes: 'All laboratory simulations completed and verified in C.',
      attachmentIds: [],
      links: [],
      createdAt: now - 20 * 86400000,
      updatedAt: now
    };

    await db.modules.bulkAdd([mod1, mod2]);

    // Seed College Work
    const work1: CollegeWork = {
      id: 'work_algo_assign1',
      title: 'Problem Set 3: Flow Networks & Max-Flow Min-Cut',
      description: 'Implement Ford-Fulkerson with Edmonds-Karp augmentation and write asymptotic proofs for residual graphs.',
      subjectId: 'sub_algo',
      category: 'assignment',
      assignedDate: today,
      dueDate: nextWeek,
      priority: 'high',
      status: 'in_progress',
      attachmentIds: [],
      links: [
        { title: 'Assignment Reference Sheet', url: 'https://cs.university.edu/algo/pset3.pdf' }
      ],
      remarks: 'Double-check bottleneck capacity calculation in phase 2.',
      tags: ['Homework', 'Proof', 'Implementation'],
      createdAt: now - 86400000,
      updatedAt: now
    };

    const work2: CollegeWork = {
      id: 'work_os_lab',
      title: 'Lab Record: Multi-Threaded Cache Simulator',
      description: 'Complete documentation for LRU and Clock replacement policies tested against synthetic memory traces.',
      subjectId: 'sub_os',
      category: 'lab_record',
      assignedDate: today,
      dueDate: tomorrow,
      priority: 'urgent',
      status: 'in_progress',
      attachmentIds: [],
      links: [],
      remarks: 'Need professor signature on experimental verification page.',
      tags: ['Lab', 'C++', 'Systems'],
      createdAt: now - 2 * 86400000,
      updatedAt: now
    };

    await db.collegeWork.bulkAdd([work1, work2]);

    // Seed Schedules
    const sched1: ScheduleEvent = {
      id: 'sched_1',
      title: 'Algorithms Seminar & Tutorial',
      description: 'Discussion on Edmonds-Karp complexity proofs and bipartite matching.',
      date: today,
      startTime: '10:00',
      endTime: '11:30',
      category: 'college',
      priority: 'high',
      color: '#B66A3C',
      subjectId: 'sub_algo',
      location: 'Lecture Hall C, South Wing',
      recurrence: 'weekly',
      isCompleted: false,
      createdAt: now,
      updatedAt: now
    };

    const sched2: ScheduleEvent = {
      id: 'sched_2',
      title: 'Operating Systems Laboratory Session',
      description: 'Hands-on evaluation of POSIX threads and synchronization primitives.',
      date: today,
      startTime: '14:00',
      endTime: '16:00',
      category: 'college',
      priority: 'medium',
      color: '#72734B',
      subjectId: 'sub_os',
      location: 'Computer Systems Lab 2',
      recurrence: 'weekly',
      isCompleted: false,
      createdAt: now,
      updatedAt: now
    };

    const sched3: ScheduleEvent = {
      id: 'sched_3',
      title: 'Quiet Study Session — Dynamic Programming',
      description: 'Solve 4 standard LCS and matrix chain multiplication problems.',
      date: today,
      startTime: '18:30',
      endTime: '20:30',
      category: 'study',
      priority: 'high',
      color: '#927D62',
      subjectId: 'sub_algo',
      location: 'Central Library Reading Desk #14',
      recurrence: 'none',
      isCompleted: false,
      createdAt: now,
      updatedAt: now
    };

    await db.schedules.bulkAdd([sched1, sched2, sched3]);

    // Seed Academic Log
    const log1: AcademicLog = {
      id: 'log_001',
      logNumber: 1,
      title: 'Investigation into Cache Thrashing under Concurrent Strided Access',
      date: today,
      time: '15:30',
      description: 'Conducted empirical benchmark runs comparing L1/L2 cache hit ratios across multi-threaded thread pools. Observed significant false sharing when structures were aligned on 32-byte boundaries instead of 64-byte hardware cache lines.',
      category: 'experiment',
      subjectId: 'sub_os',
      relatedWorkId: 'work_os_lab',
      attachmentIds: [],
      links: [
        { title: 'Hardware Cache Architecture Paper', url: 'https://doi.org/10.1145/example' }
      ],
      tags: ['Experiment', 'Cache', 'Concurrency', 'Benchmark'],
      personalRemarks: 'Padding the struct with 64-byte alignment completely eliminated false sharing latency spikes. Remember to cite this in the final lab record submission.',
      createdAt: now - 3600000,
      updatedAt: now - 3600000
    };

    await db.academicLogs.add(log1);

    // Seed Notes
    const note1: Note = {
      id: 'note_welcome',
      title: 'Welcome to your Archive Notebook',
      content: `# ARCHIVE — Personal Academic Desk\n\nThis personal workspace stores all your collegiate records, schedules, laboratory experiments, files, and notes **strictly inside your local device's IndexedDB storage**.\n\n### Guiding Principles:\n- **No Cloud Synchronization**: Everything stays on your machine.\n- **Full Offline Availability**: Access all documents and notes without connectivity.\n- **Reliable Backups**: Use the Backup tab in Settings to export a ZIP archive anytime.\n- **Distraction-Free Vintage Design**: Structured for clarity, contemplation, and focused study.\n\n*Created for scholars who cherish craft, precision, and privacy.*`,
      category: 'important',
      tags: ['Guide', 'Welcome', 'Philosophy'],
      isFavorite: true,
      isPinned: true,
      attachmentIds: [],
      links: [],
      createdAt: now,
      updatedAt: now
    };

    const note2: Note = {
      id: 'note_algo_summary',
      title: 'Master Theorem Quick Reference & Proof Notes',
      content: `### The Master Theorem for Divide-and-Conquer Recurrences\n\nFor recurrences of the form: \n\`T(n) = a*T(n/b) + f(n)\`\n\n1. **Case 1**: If \`f(n) = O(n^(log_b(a) - ε))\`, then \`T(n) = Θ(n^log_b(a))\`.\n2. **Case 2**: If \`f(n) = Θ(n^log_b(a) * log^k(n))\`, then \`T(n) = Θ(n^log_b(a) * log^(k+1)(n))\`.\n3. **Case 3**: If \`f(n) = Ω(n^(log_b(a) + ε))\` and regularity condition holds, then \`T(n) = Θ(f(n))\`.\n\n*Note: Does not apply when f(n) is not polynomially bounded.*`,
      subjectId: 'sub_algo',
      category: 'study',
      tags: ['Complexity', 'Algorithms', 'CheatSheet'],
      isFavorite: true,
      isPinned: false,
      attachmentIds: [],
      links: [],
      createdAt: now - 86400000,
      updatedAt: now - 86400000
    };

    await db.notes.bulkAdd([note1, note2]);

    // Seed Initial Activity
    await logActivity('created', 'subject', 'Algorithms & Data Structures (CS-301)', 'sub_algo');
    await logActivity('created', 'work', 'Problem Set 3: Flow Networks', 'work_algo_assign1');
  }
}
