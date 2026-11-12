export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';

export type WorkCategory = 
  | 'assignment' 
  | 'lab_record' 
  | 'project' 
  | 'seminar' 
  | 'presentation' 
  | 'report' 
  | 'examination' 
  | 'workshop' 
  | 'college_activity' 
  | 'other';

export type WorkStatus = 
  | 'not_started' 
  | 'in_progress' 
  | 'completed' 
  | 'submitted' 
  | 'archived';

export type EventCategory = 
  | 'study' 
  | 'college' 
  | 'assignment' 
  | 'examination' 
  | 'project' 
  | 'personal' 
  | 'meeting' 
  | 'other';

export type EventRecurrence = 'none' | 'daily' | 'weekly' | 'weekdays' | 'monthly';

export type NoteCategory = 
  | 'quick' 
  | 'subject' 
  | 'journal' 
  | 'study' 
  | 'personal' 
  | 'important';

export type LogCategory = 
  | 'experiment' 
  | 'lecture' 
  | 'assignment_progress' 
  | 'project_milestone' 
  | 'seminar' 
  | 'exam_prep' 
  | 'field_work' 
  | 'other';

export type FileCategory = 
  | 'image' 
  | 'document' 
  | 'pdf' 
  | 'presentation' 
  | 'video' 
  | 'audio' 
  | 'archive' 
  | 'other';

export interface InstructorInfo {
  name: string;
  email?: string;
  office?: string;
  phone?: string;
  notes?: string;
}

export interface TopicItem {
  id: string;
  title: string;
  isCompleted: boolean;
  notes?: string;
}

export interface LinkItem {
  title: string;
  url: string;
  description?: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  semester: string;
  credits: number;
  description: string;
  color: string;
  instructor?: InstructorInfo;
  syllabus?: string;
  tags: string[];
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Module {
  id: string;
  subjectId: string;
  name: string;
  orderIndex: number;
  description: string;
  topics: TopicItem[];
  isCompleted: boolean;
  notes?: string;
  attachmentIds: string[];
  links: LinkItem[];
  createdAt: number;
  updatedAt: number;
}

export interface CollegeWork {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  category: WorkCategory;
  assignedDate: string; // YYYY-MM-DD
  dueDate: string;      // YYYY-MM-DD
  priority: PriorityLevel;
  status: WorkStatus;
  attachmentIds: string[];
  links: LinkItem[];
  remarks?: string;
  tags: string[];
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  category: EventCategory;
  priority: PriorityLevel;
  color?: string;
  subjectId?: string;
  relatedWorkId?: string;
  location?: string;
  reminderMinutes?: number;
  recurrence: EventRecurrence;
  isCompleted: boolean;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  subjectId?: string;
  category: NoteCategory;
  tags: string[];
  isFavorite: boolean;
  isPinned: boolean;
  attachmentIds: string[];
  links: LinkItem[];
  createdAt: number;
  updatedAt: number;
}

export interface AcademicLog {
  id: string;
  logNumber: number; // e.g. 1, 2, 3 -> displayed as Log #001
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  description: string;
  category: LogCategory;
  subjectId?: string;
  relatedWorkId?: string;
  attachmentIds: string[];
  links: LinkItem[];
  tags: string[];
  personalRemarks?: string;
  createdAt: number;
  updatedAt: number;
}

export interface FileItem {
  id: string;
  originalName: string;
  displayName: string;
  description?: string;
  category: FileCategory;
  uploadDate: number;
  fileSize: number; // bytes
  fileType: string; // extension
  mimeType: string;
  tags: string[];
  subjectId?: string;
  relatedWorkId?: string;
  relatedLogId?: string;
  isFavorite: boolean;
  blob: Blob;
  createdAt: number;
  updatedAt: number;
}

export interface StudySession {
  id: string;
  subjectId?: string;
  date: string; // YYYY-MM-DD
  durationMinutes: number;
  topicsCovered?: string;
  remarks?: string;
  createdAt: number;
}

export interface ActivityHistory {
  id: string;
  action: 'created' | 'updated' | 'completed' | 'deleted' | 'submitted' | 'backup';
  entityType: 'subject' | 'work' | 'event' | 'note' | 'log' | 'file' | 'backup';
  entityId?: string;
  entityTitle: string;
  timestamp: number;
  details?: string;
}

export interface DashboardWidgetConfig {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
}

export interface AppSettings {
  id: string;
  scholarName: string;
  greetingPrefix: string;
  theme: 'vintage-light' | 'vintage-dark';
  accentColor: string;
  fontScale: 'compact' | 'normal' | 'relaxed';
  timeFormat: '12h' | '24h';
  weekStartDay: 0 | 1; // 0 for Sunday, 1 for Monday
  currentSemester: string;
  targetStudyHoursWeekly: number;
  sidebarCollapsed: boolean;
  defaultLandingPage: string;
  dashboardWidgets: DashboardWidgetConfig[];
  updatedAt: number;
}
