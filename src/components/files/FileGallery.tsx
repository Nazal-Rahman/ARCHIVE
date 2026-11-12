import React, { useState, useEffect, useRef } from 'react';
import {
  FolderArchive,
  Upload,
  Search,
  Grid,
  List as ListIcon,
  Download,
  Trash2,
  Eye,
  Star,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  FileCode,
  Image as ImageIcon,
  Film,
  Music,
  HardDrive
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, logActivity, formatBytes, getStorageEstimate } from '../../db/database';
import { saveAs } from 'file-saver';
import type { FileItem, FileCategory } from '../../db/types';

export const FileGallery: React.FC = () => {
  const { addToast } = useApp();

  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // Lightbox & Previewer state
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFileList, setUploadFileList] = useState<FileList | null>(null);
  const [uploadCategory, setUploadCategory] = useState<FileCategory>('document');
  const [uploadSubjectId, setUploadSubjectId] = useState<string>('');
  const [uploadTags, setUploadTags] = useState<string>('');

  // Storage info
  const [storageStats, setStorageStats] = useState<{ usage: number; quota: number }>({ usage: 0, quota: 0 });

  // Queries
  const files = useLiveQuery(() => db.files.toArray()) || [];
  const subjects = useLiveQuery(() => db.subjects.where('isArchived').equals(0).toArray()) || [];

  useEffect(() => {
    getStorageEstimate().then(est => setStorageStats({ usage: est.usage, quota: est.quota }));
  }, [files.length]);

  // Object URL lifecycle management
  useEffect(() => {
    if (previewFile && previewFile.blob) {
      const url = URL.createObjectURL(previewFile.blob);
      setPreviewBlobUrl(url);
      setZoomLevel(1);
      setRotation(0);

      return () => {
        URL.revokeObjectURL(url);
        setPreviewBlobUrl(null);
      };
    }
  }, [previewFile]);

  // Filtered files
  const filteredFiles = files.filter(f => {
    if (favoritesOnly && !f.isFavorite) return false;
    if (selectedCategory !== 'all' && f.category !== selectedCategory) return false;
    if (selectedSubject !== 'all' && f.subjectId !== selectedSubject) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        f.displayName.toLowerCase().includes(q) ||
        f.originalName.toLowerCase().includes(q) ||
        f.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Upload files handler
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileList || uploadFileList.length === 0) return;

    let addedCount = 0;
    const tagArray = uploadTags.split(',').map(t => t.trim()).filter(Boolean);

    for (let i = 0; i < uploadFileList.length; i++) {
      const file = uploadFileList[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      let cat = uploadCategory;
      if (file.type.startsWith('image/')) cat = 'image';
      else if (file.type === 'application/pdf' || ext === 'pdf') cat = 'pdf';
      else if (['ppt', 'pptx'].includes(ext)) cat = 'presentation';
      else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) cat = 'archive';
      else if (file.type.startsWith('video/')) cat = 'video';
      else if (file.type.startsWith('audio/')) cat = 'audio';

      const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

      await db.files.add({
        id: fileId,
        originalName: file.name,
        displayName: file.name,
        category: cat,
        uploadDate: Date.now(),
        fileSize: file.size,
        fileType: ext,
        mimeType: file.type,
        tags: tagArray,
        subjectId: uploadSubjectId || undefined,
        isFavorite: false,
        blob: file,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      await logActivity('created', 'file', file.name, fileId);
      addedCount++;
    }

    addToast(`Successfully stored ${addedCount} file(s) in local IndexedDB vault`, 'success');
    setIsUploadOpen(false);
    setUploadFileList(null);
    setUploadTags('');
  };

  // Download File
  const handleDownloadFile = (item: FileItem) => {
    if (item.blob) {
      saveAs(item.blob, item.originalName);
      addToast(`Downloading ${item.displayName}`, 'info');
    }
  };

  // Delete File
  const handleDeleteFile = async (item: FileItem) => {
    if (window.confirm(`Permanently remove "${item.displayName}" from your local archive?`)) {
      await db.files.delete(item.id);
      await logActivity('deleted', 'file', item.displayName, item.id);
      if (previewFile?.id === item.id) {
        setPreviewFile(null);
      }
      addToast('File removed from library', 'info');
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = async (item: FileItem) => {
    await db.files.update(item.id, {
      isFavorite: !item.isFavorite,
      updatedAt: Date.now()
    });
  };

  // Navigate lightbox
  const handleNextPreview = () => {
    if (!previewFile) return;
    const currentIndex = filteredFiles.findIndex(f => f.id === previewFile.id);
    if (currentIndex < filteredFiles.length - 1) {
      setPreviewFile(filteredFiles[currentIndex + 1]);
    }
  };

  const handlePrevPreview = () => {
    if (!previewFile) return;
    const currentIndex = filteredFiles.findIndex(f => f.id === previewFile.id);
    if (currentIndex > 0) {
      setPreviewFile(filteredFiles[currentIndex - 1]);
    }
  };

  const renderFileIcon = (category: FileCategory, size = 'w-6 h-6') => {
    switch (category) {
      case 'image':
        return <ImageIcon className={`${size} text-[var(--accent)]`} />;
      case 'pdf':
        return <FileText className={`${size} text-[var(--accent-red)]`} />;
      case 'video':
        return <Film className={`${size} text-[var(--accent-olive)]`} />;
      case 'audio':
        return <Music className={`${size} text-[var(--accent)]`} />;
      case 'presentation':
        return <FileCode className={`${size} text-[var(--accent)]`} />;
      default:
        return <FileText className={`${size} text-[var(--text-secondary)]`} />;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--accent)] font-bold">
            Personal Digital Library & Documents
          </span>
          <h1 className="text-2xl font-serif font-bold text-[var(--text-primary)]">
            Personal File Gallery
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Storage Stat Pill */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--border-color)] bg-[var(--bg-surface)] text-xs font-mono text-[var(--text-secondary)]"
            title="IndexedDB local binary storage"
          >
            <HardDrive className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Vault: {formatBytes(storageStats.usage)}</span>
          </div>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="px-3 py-1.5 rounded vintage-btn-primary flex items-center gap-1.5 text-xs font-mono"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Store File</span>
          </button>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="vintage-card rounded p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-[var(--accent)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents, PDFs, images, archives..."
            className="w-full bg-transparent border-none text-xs text-[var(--text-primary)] focus:outline-none"
          />
        </div>

        {/* Categories, Subject, View toggles */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="p-1.5 rounded vintage-input capitalize"
          >
            <option value="all">All Formats</option>
            <option value="pdf">PDFs</option>
            <option value="image">Images</option>
            <option value="document">Documents</option>
            <option value="presentation">Presentations</option>
            <option value="archive">ZIP Archives</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
          </select>

          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="p-1.5 rounded vintage-input"
          >
            <option value="all">All Subjects</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>

          <button
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className={`p-1.5 rounded border transition-colors ${
              favoritesOnly
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)]'
            }`}
            title="Favorites Only"
          >
            <Star className="w-3.5 h-3.5" />
          </button>

          {/* Layout switches */}
          <div className="flex rounded border border-[var(--border-color)] overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 ${viewMode === 'grid' ? 'bg-[var(--text-primary)] text-[var(--bg-surface)]' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'}`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 ${viewMode === 'list' ? 'bg-[var(--text-primary)] text-[var(--bg-surface)]' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'}`}
              title="List View"
            >
              <ListIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main File Collection */}
      {filteredFiles.length === 0 ? (
        <div className="vintage-card rounded p-12 text-center text-[var(--text-secondary)]">
          <FolderArchive className="w-10 h-10 mx-auto mb-2 opacity-40 text-[var(--accent)]" />
          <h3 className="font-serif text-base font-bold text-[var(--text-primary)]">
            No local files match query
          </h3>
          <p className="text-xs font-mono mt-1">
            Store course textbooks, laboratory photos, or lecture presentations directly in your browser.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredFiles.map(file => {
            const subject = subjects.find(s => s.id === file.subjectId);

            return (
              <div
                key={file.id}
                className="vintage-card vintage-card-hover rounded overflow-hidden flex flex-col justify-between group border border-[var(--border-color)] relative"
              >
                {/* Favorite Star */}
                <button
                  onClick={() => handleToggleFavorite(file)}
                  className="absolute top-2 right-2 z-10 p-1 rounded-full bg-[var(--bg-surface)]/80 text-[var(--accent)] hover:scale-110 transition-transform"
                >
                  <Star className={`w-3.5 h-3.5 ${file.isFavorite ? 'fill-[var(--accent)]' : ''}`} />
                </button>

                {/* File Thumbnail / Preview Area */}
                <div
                  onClick={() => setPreviewFile(file)}
                  className="h-28 bg-[var(--bg-inset)]/40 flex items-center justify-center cursor-pointer overflow-hidden p-2"
                >
                  {file.category === 'image' && file.blob ? (
                    <img
                      src={URL.createObjectURL(file.blob)}
                      alt={file.displayName}
                      className="h-full w-full object-cover rounded"
                      onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      {renderFileIcon(file.category, 'w-8 h-8')}
                      <span className="font-mono text-[10px] uppercase font-bold text-[var(--text-secondary)]">
                        {file.fileType || 'FILE'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-2.5 space-y-1">
                  <h4
                    onClick={() => setPreviewFile(file)}
                    className="font-mono font-bold text-xs text-[var(--text-primary)] truncate cursor-pointer hover:text-[var(--accent)]"
                    title={file.displayName}
                  >
                    {file.displayName}
                  </h4>
                  <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)]">
                    <span>{formatBytes(file.fileSize)}</span>
                    {subject && <span className="text-[var(--accent)]">{subject.code}</span>}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="p-1.5 bg-[var(--bg-inset)]/20 border-t border-[var(--border-color)] flex items-center justify-between">
                  <button
                    onClick={() => setPreviewFile(file)}
                    className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    title="Preview"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDownloadFile(file)}
                    className="p-1 text-[var(--text-secondary)] hover:text-[var(--accent)]"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteFile(file)}
                    className="p-1 text-[var(--text-secondary)] hover:text-[var(--accent-red)]"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="vintage-card rounded divide-y divide-[var(--border-color)] overflow-hidden">
          {filteredFiles.map(file => {
            const subject = subjects.find(s => s.id === file.subjectId);

            return (
              <div
                key={file.id}
                className="p-3 flex items-center justify-between gap-3 hover:bg-[var(--bg-inset)]/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={() => handleToggleFavorite(file)} className="text-[var(--accent)]">
                    <Star className={`w-3.5 h-3.5 ${file.isFavorite ? 'fill-[var(--accent)]' : ''}`} />
                  </button>
                  {renderFileIcon(file.category, 'w-5 h-5')}
                  <div className="truncate">
                    <div
                      onClick={() => setPreviewFile(file)}
                      className="font-mono text-xs font-bold text-[var(--text-primary)] hover:text-[var(--accent)] cursor-pointer truncate"
                    >
                      {file.displayName}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--text-secondary)]">
                      <span>{formatBytes(file.fileSize)}</span>
                      <span>•</span>
                      <span>{new Date(file.uploadDate).toLocaleDateString()}</span>
                      {subject && (
                        <>
                          <span>•</span>
                          <span className="text-[var(--accent)] font-semibold">{subject.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setPreviewFile(file)}
                    className="p-1.5 rounded vintage-btn-secondary"
                    title="Preview"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDownloadFile(file)}
                    className="p-1.5 rounded vintage-btn-secondary"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteFile(file)}
                    className="p-1.5 rounded vintage-btn-secondary text-[var(--accent-red)]"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox / Document Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs">
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-file-title"
            className="relative w-full max-w-4xl h-[85vh] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Lightbox Header */}
            <div className="p-3 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-surface-elevated)]">
              <div className="flex items-center gap-2 truncate">
                <span className="font-mono text-xs uppercase px-1.5 py-0.5 rounded bg-[var(--bg-inset)] font-bold text-[var(--accent)]">
                  {previewFile.fileType.toUpperCase()}
                </span>
                <h3 id="preview-file-title" className="font-mono font-bold text-xs sm:text-sm text-[var(--text-primary)] truncate">
                  {previewFile.displayName}
                </h3>
              </div>

              <div className="flex items-center gap-1.5">
                {previewFile.category === 'image' && (
                  <>
                    <button
                      onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                      className="p-1.5 rounded vintage-btn-secondary"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
                      className="p-1.5 rounded vintage-btn-secondary"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setRotation(prev => (prev + 90) % 360)}
                      className="p-1.5 rounded vintage-btn-secondary"
                      title="Rotate"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleDownloadFile(previewFile)}
                  className="px-2.5 py-1.5 rounded vintage-btn-primary flex items-center gap-1 text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  aria-label="Close Preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lightbox Content Viewer */}
            <div className="flex-1 bg-[var(--bg-inset)]/30 overflow-auto flex items-center justify-center p-4 relative">
              {/* Prev / Next buttons */}
              <button
                onClick={handlePrevPreview}
                className="absolute left-2 p-2 rounded-full bg-[var(--bg-surface)]/80 border border-[var(--border-color)] text-[var(--text-primary)] hover:scale-110 transition-transform z-10"
                title="Previous file"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextPreview}
                className="absolute right-2 p-2 rounded-full bg-[var(--bg-surface)]/80 border border-[var(--border-color)] text-[var(--text-primary)] hover:scale-110 transition-transform z-10"
                title="Next file"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {previewFile.category === 'image' && previewBlobUrl ? (
                <img
                  src={previewBlobUrl}
                  alt={previewFile.displayName}
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease-out'
                  }}
                  className="max-h-full max-w-full object-contain rounded shadow-lg select-none"
                />
              ) : previewFile.category === 'pdf' && previewBlobUrl ? (
                <iframe
                  src={previewBlobUrl}
                  title={previewFile.displayName}
                  className="w-full h-full rounded border border-[var(--border-color)]"
                />
              ) : (
                <div className="text-center p-8 vintage-card rounded max-w-md">
                  {renderFileIcon(previewFile.category, 'w-12 h-12 mx-auto mb-3')}
                  <h4 className="font-serif font-bold text-base text-[var(--text-primary)] mb-1">
                    {previewFile.displayName}
                  </h4>
                  <p className="text-xs font-mono text-[var(--text-secondary)] mb-4">
                    {formatBytes(previewFile.fileSize)} • {previewFile.mimeType || previewFile.fileType.toUpperCase()}
                  </p>
                  <button
                    onClick={() => handleDownloadFile(previewFile)}
                    className="px-4 py-2 rounded vintage-btn-primary text-xs inline-flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Native File</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Files Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsUploadOpen(false)} />
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-modal-title"
            className="relative w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border-color)] rounded shadow-2xl overflow-hidden z-10 flex flex-col"
          >
            <div className="p-3 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-surface-elevated)]">
              <h3 id="upload-modal-title" className="font-serif font-bold text-sm text-[var(--text-primary)]">
                Store Local Files to Archive Vault
              </h3>
              <button onClick={() => setIsUploadOpen(false)} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close modal">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Select Files (Multi-file upload supported) *
                </label>
                <input
                  type="file"
                  multiple
                  required
                  onChange={(e) => setUploadFileList(e.target.files)}
                  className="w-full text-xs font-mono file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-mono file:bg-[var(--text-primary)] file:text-[var(--bg-surface)] hover:file:bg-[var(--accent)]"
                />
                <p className="text-[10px] text-[var(--text-secondary)] font-mono mt-1">
                  Files are saved directly as Blobs in this device&apos;s IndexedDB. No cloud transmission.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Format Category
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value as FileCategory)}
                    className="w-full p-2 text-xs rounded vintage-input capitalize"
                  >
                    <option value="document">Document / Notes</option>
                    <option value="pdf">PDF Document</option>
                    <option value="image">Image / Diagram</option>
                    <option value="presentation">Presentation / PPT</option>
                    <option value="archive">ZIP Archive</option>
                    <option value="video">Video Recording</option>
                    <option value="audio">Audio Lecture</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                    Related Subject
                  </label>
                  <select
                    value={uploadSubjectId}
                    onChange={(e) => setUploadSubjectId(e.target.value)}
                    className="w-full p-2 text-xs rounded vintage-input"
                  >
                    <option value="">(No specific course)</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-[var(--text-secondary)] mb-1">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  placeholder="e.g. Reference, Syllabus, Assignment 2, ExamPrep"
                  className="w-full p-2 text-xs rounded vintage-input"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[var(--border-color)]">
                <button type="button" onClick={() => setIsUploadOpen(false)} className="px-3 py-1.5 rounded vintage-btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={!uploadFileList || uploadFileList.length === 0} className="px-4 py-1.5 rounded vintage-btn-primary">
                  Store to Archive Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
