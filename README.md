# ARCHIVE — Personal Academic Workspace & Productivity Management System

> **A private, single-user, local-first academic operating system designed for collegiate life, academic activities, schedules, digital library documents, assignments, notes, and productivity.**

---

## 🏛️ Design Philosophy: Retro-Vintage Academic Library

ARCHIVE fuses the warmth, tactile depth, and distinguished character of a traditional academic office with high-performance local web technology.

- **Palette**: Aged Paper (`#E9DFC9`), Warm Cream (`#F4EBDD`), Antique Beige (`#D8C8A9`), Dark Walnut (`#382A20`), Coffee Brown (`#66503B`), Burnt Orange (`#B66A3C`), Olive Green (`#72734B`), and Muted Red (`#A44F42`).
- **Typography**: 
  - Headings: *Playfair Display*
  - Body & Readings: *Lora*
  - Timestamps, IDs & Metrics: *IBM Plex Mono*
- **Visuals**: Ruled parchment notebook lines, vintage postal & library badges, leather-bound aesthetics, index-card tabbed file storage, wax-seal celebration confetti.

---

## 🔒 100% Local-First & Private Architecture

- **Zero Cloud Reliance**: No Firebase, no Supabase, no external databases.
- **Local Device Isolation**: The application operates autonomously on each device with an isolated IndexedDB vault.
- **Binary File Storage**: Stored as native `Blob` objects directly in IndexedDB.
- **Persistence Privilege**: Supports the browser's `navigator.storage.persist()` API to protect against automatic browser cache evictions.
- **PWA & Offline-First**: Powered by `vite-plugin-pwa` with Workbox caching the entire application shell and web fonts for continuous offline study.

---

## 🗂️ Database Architecture (Dexie.js / IndexedDB)

| Table | Description |
|---|---|
| `subjects` | Courses, credit weightings, semester codes, syllabus texts, instructor contact details, and accent colors. |
| `modules` | Subject course modules with topic checklists, progress tracking, and notes. |
| `collegeWork` | Assignments, lab records, projects, seminars, exams, deadlines, priorities, and attachments. |
| `schedules` | Calendar events, recurring routines, room locations, and completion statuses. |
| `notes` | Parchment notebook entries with markdown formatting, pinning, and tags. |
| `academicLogs` | Formal academic records (`Log #001`, `Log #002`...) with empirical procedures and reflections. |
| `files` | Digital file library storing real binary blobs (PDFs, images, slides, archives). |
| `studySessions`| Focus study sessions logging durations and covered topics. |
| `activityHistory` | Transparent audit trail of academic milestones and actions. |
| `settings` | User appearance preferences, widget orders, time formats, and semester configurations. |

---

## 📦 Implemented Modules

1. **Dashboard**:
   - Personalized greeting, live vintage clock & calendar date stamp.
   - 10 toggleable, rearrangeable, and collapsible widgets.
   - Scratchpad with 1-click conversion to permanent notebook notes.
2. **Scheduler & Calendar**:
   - Monthly calendar grid and agenda list views.
   - Event creation, recurrence (daily, weekly, weekdays, monthly), category filtering, completion checks.
3. **Subject Manager**:
   - Active & archived courses, credit calculations, syllabus progress bars.
   - **Subject Workspace** with 7 dedicated tabs: *Overview*, *Syllabus*, *Modules*, *Notes*, *Materials*, *Work*, *Links*.
4. **College Work Manager**:
   - *List View*, *Kanban Board View*, and *Completed Work Archive*.
   - Due date countdowns, overdue warning indicators, priority tags, and binary file attachments.
5. **Personal File Gallery**:
   - Digital library supporting PDFs, Images, Documents, Presentations, Videos, and ZIPs.
   - Full-screen lightbox viewer with zoom, rotation, and next/prev navigation.
   - Built-in PDF iframe previewer and direct downloads.
6. **Academic Logbook**:
   - Numbered ledger (`Log #001`) with timeline view and grid view.
   - Formal documentation of experiments, apparatus setups, and personal deductions.
7. **Notes & Personal Journal**:
   - Notebook ruled interface with markdown formatting toolbar.
   - Non-intrusive auto-save with subtle sync indicator.
8. **Progress Tracker**:
   - Real-time empirical statistics calculated strictly from stored records.
   - Topic mastery rate, work submission percentage, and weekly study goal gauge.
   - Focus study session logging.
9. **Settings & Vault Manager**:
   - **Full ZIP Backup**: Bundles `database.json` and all binary files into `ARCHIVE_Backup_YYYY-MM-DD.zip`.
   - **Selective Backup**: Export specific tables on demand.
   - **Restoration Engine**: Inspects backups, validates schemas, and offers Safe Merge or Clean Overwrite.
   - Persistent storage manager & theme customizer (Parchment Light / Dark Leather).

---

## 🚀 Running the Application Locally

```bash
# 1. Install dependencies
npm install

# 2. Run development server
npm run dev

# 3. Build for production (Generates PWA Service Worker & assets in dist/)
npm run build

# 4. Preview production build locally
npm run preview
```
