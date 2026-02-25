'use client';

/**
 * Project Knowledge Pool Component
 * ================================
 * Projektspezifisches Wissens-Pool mit Dokumenten, Websites und Notizen
 * - Upload von PDFs, DOCX
 * - Website-URLs analysieren
 * - Notizen erstellen
 * - Wissensboxen zum Nachlesen
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Globe,
  Upload,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  BookOpen,
  ExternalLink,
  Search,
  X,
  File,
  StickyNote,
  Sparkles,
  Check,
  AlertTriangle,
  Users,
  Building2,
  Target,
  Briefcase,
  Award,
  BarChart3,
  Lightbulb,
  Hash,
  GraduationCap,
  Save,
} from 'lucide-react';
import {
  ProjectKnowledgePool as KnowledgePoolType,
  KnowledgeDocument,
  KnowledgeWebsite,
  KnowledgeNote,
} from '@/store/types';
import { PostItNoteEditor, PostItNote } from './PostItNoteEditor';

// Timeout helper to prevent infinite hangs on file extraction or API calls
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${label} dauerte länger als ${ms / 1000}s`)), ms)
    )
  ]);
}

interface ProjectKnowledgePoolProps {
  knowledgePool: KnowledgePoolType;
  onUpdate: (pool: KnowledgePoolType) => void;
  onSaveToProject?: () => void; // Callback to persist knowledge pool to project
  language?: string;
  compact?: boolean;
  initialEditingNoteId?: string | null; // If set, opens notes tab and starts editing this note
  onEditingNoteChange?: (noteId: string | null) => void; // Callback when editing state changes
}

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  de: {
    study: 'Studie',
    partner_info: 'Partner-Info',
    previous_project: 'Früheres Projekt',
    statistics: 'Statistiken',
    reference: 'Referenz',
    other: 'Sonstiges',
    partner_website: 'Partner-Website',
    project_website: 'Projekt-Website',
    insight: 'Erkenntnis',
    reminder: 'Erinnerung',
    draft: 'Entwurf',
  },
  en: {
    study: 'Study',
    partner_info: 'Partner Info',
    previous_project: 'Previous Project',
    statistics: 'Statistics',
    reference: 'Reference',
    other: 'Other',
    partner_website: 'Partner Website',
    project_website: 'Project Website',
    insight: 'Insight',
    reminder: 'Reminder',
    draft: 'Draft',
  },
};

export default function ProjectKnowledgePool({
  knowledgePool,
  onUpdate,
  onSaveToProject,
  language = 'de',
  compact = false,
  initialEditingNoteId,
  onEditingNoteChange,
}: ProjectKnowledgePoolProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [activeTab, setActiveTab] = useState<'documents' | 'websites' | 'notes'>('documents');
  const [isUploading, setIsUploading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [newWebsiteUrl, setNewWebsiteUrl] = useState('');
  const [newWebsiteCategory, setNewWebsiteCategory] = useState<KnowledgeWebsite['category']>('reference');
  const [showAddNote, setShowAddNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState({ title: '', content: '', category: 'insight' as KnowledgeNote['category'] });
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [analyzingDocId, setAnalyzingDocId] = useState<string | null>(null); // Track which doc is being analyzed
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // Track unsaved changes

  // Document type selection state
  const [pendingFiles, setPendingFiles] = useState<FileList | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<KnowledgeDocument['category']>('other');
  const [showDocTypeSelector, setShowDocTypeSelector] = useState(false);

  // Document type labels for the three main types
  const DOC_TYPE_OPTIONS: { value: KnowledgeDocument['category']; labelDE: string; labelEN: string; icon: string; description: string }[] = [
    {
      value: 'partner_info',
      labelDE: 'Partner-Info',
      labelEN: 'Partner Info',
      icon: '🏢',
      description: language === 'de'
        ? 'PIF, Organisationsprofile, Partner-Präsentationen'
        : 'PIF, organization profiles, partner presentations'
    },
    {
      value: 'study',
      labelDE: 'Studie',
      labelEN: 'Study',
      icon: '📊',
      description: language === 'de'
        ? 'Forschungsstudien, Berichte, Statistiken, EU-Reports'
        : 'Research studies, reports, statistics, EU reports'
    },
    {
      value: 'previous_project',
      labelDE: 'Projekt',
      labelEN: 'Project',
      icon: '📁',
      description: language === 'de'
        ? 'Laufende oder abgeschlossene Projekte, Projektberichte'
        : 'Running or completed projects, project reports'
    },
  ];

  // Handle external editing request
  useEffect(() => {
    if (initialEditingNoteId) {
      setIsExpanded(true);
      setActiveTab('notes');
      if (initialEditingNoteId === 'new') {
        setShowAddNote(true);
        setEditingNoteId(null);
      } else {
        setShowAddNote(false);
        setEditingNoteId(initialEditingNoteId);
        // Find the note to edit
        const noteToEdit = knowledgePool.notes?.find(n => n.id === initialEditingNoteId);
        if (noteToEdit) {
          // We'll set editingNote after the component updates
          setTimeout(() => {
            const noteEl = document.querySelector(`[data-note-id="${initialEditingNoteId}"]`);
            if (noteEl) {
              noteEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
        }
      }
      // Clear the external editing request
      onEditingNoteChange?.(null);
    }
  }, [initialEditingNoteId, onEditingNoteChange, knowledgePool.notes]);

  const labels = CATEGORY_LABELS[language] || CATEGORY_LABELS.de;

  // Use ref to always have access to latest knowledgePool value in async callbacks
  const knowledgePoolRef = useRef(knowledgePool);
  useEffect(() => {
    console.log('[KnowledgePool] knowledgePool changed, updating ref. Docs:', knowledgePool.documents?.length);
    knowledgePoolRef.current = knowledgePool;
  }, [knowledgePool]);

  // Track pending documents that are being processed (to prevent race conditions)
  const pendingDocsRef = useRef<Map<string, KnowledgeDocument>>(new Map());

  const totalItems =
    (knowledgePool.documents?.length || 0) +
    (knowledgePool.websites?.length || 0) +
    (knowledgePool.notes?.length || 0);

  // Handle initial file selection - shows type selector dialog
  const handleFileSelect = useCallback((files: FileList) => {
    console.log('[KnowledgePool] handleFileSelect called with', files.length, 'files');
    if (!files || files.length === 0) {
      console.log('[KnowledgePool] No files provided');
      return;
    }
    // Store files and show type selector
    setPendingFiles(files);
    setSelectedDocType('other'); // Reset to default
    setShowDocTypeSelector(true);
  }, []);

  // Handle actual file upload after document type is selected
  const handleFileUpload = useCallback(async (files: FileList, docCategory: KnowledgeDocument['category']) => {
    console.log('[KnowledgePool] handleFileUpload called with', files.length, 'files, category:', docCategory);
    if (!files || files.length === 0) {
      console.log('[KnowledgePool] No files provided');
      return;
    }

    setIsUploading(true);
    setIsExpanded(true); // Open to show progress
    setActiveTab('documents'); // Show documents tab

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log('[KnowledgePool] Processing file:', file.name, file.type, file.size);
      const fileType = file.name.split('.').pop()?.toLowerCase() as KnowledgeDocument['type'];

      if (!['pdf', 'docx', 'doc', 'txt'].includes(fileType || '')) {
        alert(language === 'de'
          ? `Dateityp ${fileType} wird nicht unterstützt. Erlaubt: PDF, DOCX, DOC, TXT`
          : `File type ${fileType} not supported. Allowed: PDF, DOCX, DOC, TXT`);
        continue;
      }

      const docId = `doc-${Date.now()}-${i}`;
      const newDoc: KnowledgeDocument = {
        id: docId,
        name: file.name,
        type: fileType || 'other',
        category: docCategory, // Use selected document category
        tags: [],
        status: 'uploading',
        uploadedAt: new Date(),
      };

      // Store in pending docs ref immediately
      pendingDocsRef.current.set(docId, newDoc);
      console.log('[KnowledgePool] Adding to pending docs:', docId, 'Total pending:', pendingDocsRef.current.size);

      // Get current state from ref and add the new doc
      const currentPool = knowledgePoolRef.current;
      const existingDocs = currentPool.documents || [];
      console.log('[KnowledgePool] Current docs before add:', existingDocs.length, existingDocs.map(d => d.name));

      // Add to pool immediately (shows uploading state)
      const updatedPoolWithNew = {
        documents: [...existingDocs, newDoc],
        websites: currentPool.websites || [],
        notes: currentPool.notes || [],
      };

      // Update the ref immediately so subsequent operations see this doc
      knowledgePoolRef.current = updatedPoolWithNew;
      onUpdate(updatedPoolWithNew);

      console.log('[KnowledgePool] Called onUpdate with', updatedPoolWithNew.documents.length, 'docs');

      try {
        // Extract text based on file type
        let extractedText = '';

        if (fileType === 'pdf') {
          console.log('[KnowledgePool] Extracting PDF text...');
          const { extractTextFromPDF } = await import('@/lib/rag-system');
          const result = await withTimeout(extractTextFromPDF(file), 30000, 'PDF-Extraktion');
          extractedText = result.text;
          console.log('[KnowledgePool] Extracted', extractedText.length, 'characters from PDF');
        } else if (fileType === 'docx' || fileType === 'doc') {
          console.log('[KnowledgePool] Extracting DOCX text...');
          const mammoth = await import('mammoth');
          const arrayBuffer = await withTimeout(file.arrayBuffer(), 10000, 'Datei lesen');
          const result = await withTimeout(mammoth.extractRawText({ arrayBuffer }), 30000, 'DOCX-Extraktion');
          extractedText = result.value;
          console.log('[KnowledgePool] Extracted', extractedText.length, 'characters from DOCX');
        } else if (fileType === 'txt') {
          extractedText = await file.text();
          console.log('[KnowledgePool] Extracted', extractedText.length, 'characters from TXT');
        }

        // Generate summary using AI
        let summary = '';
        let keyFindings: string[] = [];

        // AI Analysis structure
        let aiAnalysis: KnowledgeDocument['aiAnalysis'] = undefined;

        if (extractedText && extractedText.length > 100) {
          console.log('[KnowledgePool] Generating AI summary for:', file.name, 'with type:', docCategory);
          const controller = new AbortController();
          const fetchTimeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
          try {
            const response = await fetch('/api/summarize-study', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                documentText: extractedText.slice(0, 15000),
                documentName: file.name,
                documentType: docCategory, // Use the selected document type for targeted AI analysis
                language,
              }),
              signal: controller.signal,
            });
            clearTimeout(fetchTimeoutId);

            console.log('[KnowledgePool] Summary API response status:', response.status);

            if (response.ok) {
              const data = await response.json();
              console.log('[KnowledgePool] Summary API response:', JSON.stringify(data).slice(0, 1000));

              summary = data.summary?.executiveSummary || '';

              // Handle keyFindings - they can be strings or objects with 'finding' property
              const rawFindings = data.summary?.keyFindings || [];
              keyFindings = rawFindings.map((f: string | { finding: string; relevance?: string }) => {
                if (typeof f === 'string') return f;
                if (typeof f === 'object' && f.finding) return f.finding;
                return JSON.stringify(f);
              });

              // Build structured AI analysis
              aiAnalysis = {
                organizationName: data.summary?.title || undefined,
                mission: data.summary?.mission || undefined,
                staffSize: data.summary?.staffSize || undefined,
                erasmusData: data.summary?.erasmusData || undefined,
                competences: data.summary?.competences || undefined,
                targetGroups: data.summary?.targetGroups || undefined,
                relevantSectors: data.summary?.relevantSectors || undefined,
                completedProjects: data.summary?.completedProjects || undefined,
                statistics: data.summary?.statistics || undefined,
                recommendations: data.summary?.recommendations || undefined,
                usefulForProposal: data.summary?.usefulForProposal || undefined,
                keyTerms: data.summary?.keyTerms || undefined,
              };

              console.log('[KnowledgePool] AI summary generated successfully:', summary.slice(0, 100), '...');
              console.log('[KnowledgePool] Key findings:', keyFindings.length);
              console.log('[KnowledgePool] AI Analysis:', JSON.stringify(aiAnalysis).slice(0, 500));
            } else {
              const errorData = await response.json().catch(() => ({}));
              console.warn('[KnowledgePool] Summary API returned error:', response.status, errorData);
              // Document will be saved as ready without AI analysis — user can retry via "Jetzt analysieren" button
            }
          } catch (e: any) {
            clearTimeout(fetchTimeoutId);
            if (e.name === 'AbortError') {
              console.warn('[KnowledgePool] API timeout (60s) for:', file.name, '— saving without AI analysis');
            } else {
              console.warn('[KnowledgePool] Summary generation failed:', e);
            }
            // Document will still be saved as ready without AI analysis
          }
        } else {
          console.log('[KnowledgePool] Skipping summary - text too short:', extractedText?.length || 0);
        }

        // Update document with extracted content
        const finalDoc: KnowledgeDocument = {
          ...newDoc,
          extractedText,
          summary,
          keyFindings,
          aiAnalysis,
          status: 'ready',
          processedAt: new Date(),
        };

        // Update in pending docs
        pendingDocsRef.current.set(docId, finalDoc);

        // Get latest state from ref
        const latestPool = knowledgePoolRef.current;
        console.log('[KnowledgePool] Updating doc to ready. Current docs in ref:', latestPool.documents?.length || 0);
        console.log('[KnowledgePool] Doc IDs in ref:', latestPool.documents?.map(d => d.id));

        // Find and replace the uploading doc with the final one
        const currentDocs = latestPool.documents || [];
        let updatedDocs: KnowledgeDocument[];

        const existingIndex = currentDocs.findIndex(d => d.id === docId);
        if (existingIndex >= 0) {
          // Replace existing
          updatedDocs = currentDocs.map(d => d.id === docId ? finalDoc : d);
          console.log('[KnowledgePool] Replaced doc at index', existingIndex);
        } else {
          // Doc was lost somehow - re-add it
          console.warn('[KnowledgePool] Doc not found in current state, re-adding:', docId);
          updatedDocs = [...currentDocs, finalDoc];
        }

        const finalPool = {
          documents: updatedDocs,
          websites: latestPool.websites || [],
          notes: latestPool.notes || [],
        };

        // Update ref immediately
        knowledgePoolRef.current = finalPool;
        onUpdate(finalPool);

        // Remove from pending
        pendingDocsRef.current.delete(docId);

        console.log('[KnowledgePool] Document processed successfully:', file.name, 'Final doc count:', updatedDocs.length);
      } catch (error) {
        console.error('[KnowledgePool] Document processing error:', error);
        const errorDoc: KnowledgeDocument = {
          ...newDoc,
          status: 'error',
          error: (error as Error).message,
        };

        pendingDocsRef.current.set(docId, errorDoc);

        const latestPool = knowledgePoolRef.current;
        const currentDocs = latestPool.documents || [];
        let updatedDocs: KnowledgeDocument[];

        const existingIndex = currentDocs.findIndex(d => d.id === docId);
        if (existingIndex >= 0) {
          updatedDocs = currentDocs.map(d => d.id === docId ? errorDoc : d);
        } else {
          updatedDocs = [...currentDocs, errorDoc];
        }

        const errorPool = {
          documents: updatedDocs,
          websites: latestPool.websites || [],
          notes: latestPool.notes || [],
        };

        knowledgePoolRef.current = errorPool;
        onUpdate(errorPool);

        pendingDocsRef.current.delete(docId);
      }
    }

    setIsUploading(false);
    console.log('[KnowledgePool] Upload complete. Final docs in ref:', knowledgePoolRef.current.documents?.length);
  }, [onUpdate, language]); // Remove knowledgePool from deps - using ref instead

  // Handle website fetch
  const handleFetchWebsite = useCallback(async () => {
    if (!newWebsiteUrl.trim()) return;

    setIsFetching(true);

    const newWebsite: KnowledgeWebsite = {
      id: `web-${Date.now()}`,
      url: newWebsiteUrl.trim(),
      category: newWebsiteCategory,
      tags: [],
      status: 'fetching',
    };

    // Add to pool immediately
    onUpdate({
      ...knowledgePool,
      websites: [...(knowledgePool.websites || []), newWebsite],
    });

    try {
      // Fetch and analyze website
      const response = await fetch('/api/extract-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newWebsiteUrl.trim(),
          extractProfile: true,
        }),
      });

      if (!response.ok) throw new Error('Website fetch failed');

      const data = await response.json();

      const finalWebsite: KnowledgeWebsite = {
        ...newWebsite,
        title: data.organizationName || data.title || newWebsiteUrl,
        extractedText: data.rawContent?.slice(0, 10000) || '',
        summary: data.missionStatement || data.description || '',
        keyPoints: data.expertiseAreas || data.highlights || [],
        status: 'ready',
        lastFetchedAt: new Date(),
      };

      onUpdate({
        ...knowledgePool,
        websites: (knowledgePool.websites || []).map(w =>
          w.id === newWebsite.id ? finalWebsite : w
        ),
      });

      setNewWebsiteUrl('');
    } catch (error) {
      console.error('Website fetch error:', error);
      onUpdate({
        ...knowledgePool,
        websites: (knowledgePool.websites || []).map(w =>
          w.id === newWebsite.id ? { ...w, status: 'error', error: (error as Error).message } : w
        ),
      });
    }

    setIsFetching(false);
  }, [newWebsiteUrl, newWebsiteCategory, knowledgePool, onUpdate]);

  // State for editing existing notes
  const [editingNote, setEditingNote] = useState<KnowledgeNote | null>(null);

  // Sync editingNoteId with editingNote
  useEffect(() => {
    if (editingNoteId && editingNoteId !== 'new') {
      const noteToEdit = knowledgePool.notes?.find(n => n.id === editingNoteId);
      if (noteToEdit) {
        setEditingNote(noteToEdit);
        setShowAddNote(true);
        setEditingNoteId(null); // Clear after setting
      }
    }
  }, [editingNoteId, knowledgePool.notes]);

  // Handle add/update note from PostIt editor
  const handleSaveNote = useCallback((noteData: Omit<KnowledgeNote, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingNote) {
      // Update existing note
      const updatedNote: KnowledgeNote = {
        ...editingNote,
        ...noteData,
        updatedAt: new Date(),
      };
      onUpdate({
        ...knowledgePool,
        notes: (knowledgePool.notes || []).map(n =>
          n.id === editingNote.id ? updatedNote : n
        ),
      });
      setEditingNote(null);
    } else {
      // Create new note
      const note: KnowledgeNote = {
        id: `note-${Date.now()}`,
        ...noteData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      onUpdate({
        ...knowledgePool,
        notes: [...(knowledgePool.notes || []), note],
      });
    }
    setShowAddNote(false);
  }, [editingNote, knowledgePool, onUpdate]);

  // Handle update note status
  const handleUpdateNoteStatus = useCallback((noteId: string, status: KnowledgeNote['status']) => {
    onUpdate({
      ...knowledgePool,
      notes: (knowledgePool.notes || []).map(n =>
        n.id === noteId ? { ...n, status, updatedAt: new Date() } : n
      ),
    });
  }, [knowledgePool, onUpdate]);

  // Handle toggle checklist item
  const handleToggleChecklistItem = useCallback((noteId: string, checklistId: string) => {
    onUpdate({
      ...knowledgePool,
      notes: (knowledgePool.notes || []).map(n =>
        n.id === noteId
          ? {
              ...n,
              checklist: n.checklist?.map(c =>
                c.id === checklistId ? { ...c, checked: !c.checked } : c
              ),
              updatedAt: new Date()
            }
          : n
      ),
    });
  }, [knowledgePool, onUpdate]);

  // Legacy handler for simple note creation (fallback)
  const handleAddNote = useCallback(() => {
    if (!newNote.title.trim() || !newNote.content.trim()) return;

    const note: KnowledgeNote = {
      id: `note-${Date.now()}`,
      title: newNote.title.trim(),
      content: newNote.content.trim(),
      category: newNote.category,
      color: 'yellow',
      priority: 'medium',
      status: 'todo',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    onUpdate({
      ...knowledgePool,
      notes: [...(knowledgePool.notes || []), note],
    });

    setNewNote({ title: '', content: '', category: 'insight' });
    setShowAddNote(false);
  }, [newNote, knowledgePool, onUpdate]);

  // Delete item
  const deleteDocument = (id: string) => {
    onUpdate({
      ...knowledgePool,
      documents: (knowledgePool.documents || []).filter(d => d.id !== id),
    });
  };

  const deleteWebsite = (id: string) => {
    onUpdate({
      ...knowledgePool,
      websites: (knowledgePool.websites || []).filter(w => w.id !== id),
    });
  };

  const deleteNote = (id: string) => {
    onUpdate({
      ...knowledgePool,
      notes: (knowledgePool.notes || []).filter(n => n.id !== id),
    });
  };

  // Filter items by search
  const filteredDocuments = (knowledgePool.documents || []).filter(d =>
    !searchQuery || d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.summary?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredWebsites = (knowledgePool.websites || []).filter(w =>
    !searchQuery || w.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredNotes = (knowledgePool.notes || []).filter(n =>
    !searchQuery || n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Document Type Selector Modal */}
      {showDocTypeSelector && pendingFiles && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {language === 'de' ? 'Dokumenttyp auswählen' : 'Select Document Type'}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowDocTypeSelector(false);
                  setPendingFiles(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-sm text-gray-600">
              {language === 'de'
                ? `${pendingFiles.length} Datei(en) ausgewählt. Wählen Sie den Dokumenttyp für die AI-Analyse:`
                : `${pendingFiles.length} file(s) selected. Choose the document type for AI analysis:`}
            </p>

            <div className="space-y-2">
              {DOC_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedDocType(option.value)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    selectedDocType === option.value
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200 hover:border-amber-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{option.icon}</span>
                    <div>
                      <p className="font-medium text-gray-900">
                        {language === 'de' ? option.labelDE : option.labelEN}
                      </p>
                      <p className="text-sm text-gray-500">{option.description}</p>
                    </div>
                    {selectedDocType === option.value && (
                      <Check className="h-5 w-5 text-amber-500 ml-auto" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowDocTypeSelector(false);
                  setPendingFiles(null);
                }}
              >
                {language === 'de' ? 'Abbrechen' : 'Cancel'}
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
                onClick={() => {
                  if (pendingFiles) {
                    handleFileUpload(pendingFiles, selectedDocType);
                  }
                  setShowDocTypeSelector(false);
                  setPendingFiles(null);
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                {language === 'de' ? 'Hochladen' : 'Upload'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions Bar - Always visible */}
      <div className="flex flex-wrap gap-3 p-4 bg-white rounded-xl border border-amber-200">
        {/* Upload Documents */}
        <label className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg cursor-pointer hover:from-amber-600 hover:to-orange-600 transition-all shadow-md hover:shadow-lg">
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.txt"
            className="hidden"
            onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
            disabled={isUploading}
          />
          {isUploading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">
            {language === 'de' ? 'Dokument hochladen' : 'Upload Document'}
          </span>
        </label>

        {/* Add Website */}
        <Button
          variant="outline"
          className="border-teal-300 text-teal-700 hover:bg-teal-50"
          onClick={() => {
            setIsExpanded(true);
            setActiveTab('websites');
          }}
        >
          <Globe className="h-4 w-4 mr-2" />
          {language === 'de' ? 'Website hinzufügen' : 'Add Website'}
        </Button>

        {/* Add Post-It Note */}
        <Button
          variant="outline"
          className="border-yellow-400 text-yellow-700 hover:bg-yellow-50 bg-yellow-50"
          onClick={() => {
            setShowAddNote(true);
            setEditingNote(null);
          }}
        >
          <StickyNote className="h-4 w-4 mr-2" />
          {language === 'de' ? 'Post-It Notiz' : 'Post-It Note'}
        </Button>

        {/* Status summary and Save Button */}
        <div className="ml-auto flex items-center gap-4 text-sm text-gray-600">
          {/* Save indicator and button */}
          {hasUnsavedChanges && (
            <span className="flex items-center gap-1 text-orange-600 font-medium animate-pulse">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              {language === 'de' ? 'Ungespeichert' : 'Unsaved'}
            </span>
          )}
          <Button
            size="sm"
            onClick={() => {
              // Actually save to project via callback
              if (onSaveToProject) {
                onSaveToProject();
              }
              setHasUnsavedChanges(false);
              // Show a brief success message
              const btn = document.activeElement as HTMLButtonElement;
              if (btn) {
                const originalText = btn.innerHTML;
                btn.innerHTML = `<svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>${language === 'de' ? 'Gespeichert!' : 'Saved!'}`;
                btn.classList.add('bg-green-600');
                setTimeout(() => {
                  btn.innerHTML = originalText;
                  btn.classList.remove('bg-green-600');
                }, 2000);
              }
            }}
            className={`${hasUnsavedChanges ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'} text-white`}
          >
            <Save className="h-4 w-4 mr-1" />
            {language === 'de' ? 'Im Projekt speichern' : 'Save to Project'}
          </Button>
        </div>

        {/* Status counts */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          {knowledgePool.documents?.length > 0 && (
            <span className="flex items-center gap-1">
              <FileText className="h-4 w-4 text-amber-500" />
              {knowledgePool.documents.length} {language === 'de' ? 'Dok.' : 'docs'}
            </span>
          )}
          {knowledgePool.websites?.length > 0 && (
            <span className="flex items-center gap-1">
              <Globe className="h-4 w-4 text-teal-500" />
              {knowledgePool.websites.length} {language === 'de' ? 'Seiten' : 'sites'}
            </span>
          )}
          {knowledgePool.notes?.length > 0 && (
            <span className="flex items-center gap-1">
              <StickyNote className="h-4 w-4 text-yellow-500" />
              {knowledgePool.notes.length} {language === 'de' ? 'Notizen' : 'notes'}
            </span>
          )}
        </div>
      </div>

      {/* Post-It Notes - Always visible if there are notes or adding one */}
      {(filteredNotes.length > 0 || showAddNote || editingNote) && (
        <div className="p-4 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 rounded-xl border-2 border-dashed border-yellow-300">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-yellow-800 flex items-center gap-2">
              <StickyNote className="h-5 w-5" />
              {language === 'de' ? 'Post-It Notizen' : 'Post-It Notes'}
            </h3>
            {!showAddNote && !editingNote && (
              <Button
                size="sm"
                variant="ghost"
                className="text-yellow-700 hover:bg-yellow-100"
                onClick={() => setShowAddNote(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                {language === 'de' ? 'Neue Notiz' : 'New Note'}
              </Button>
            )}
          </div>

          {/* Post-It Editor */}
          {(showAddNote || editingNote) && (
            <div className="mb-4">
              <PostItNoteEditor
                note={editingNote || undefined}
                onSave={handleSaveNote}
                onCancel={() => {
                  setShowAddNote(false);
                  setEditingNote(null);
                }}
                language={language}
              />
            </div>
          )}

          {/* Post-It Grid */}
          {!showAddNote && !editingNote && filteredNotes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredNotes.map(note => (
                <PostItNote
                  key={note.id}
                  note={note}
                  onEdit={(n) => {
                    setEditingNote(n);
                    setShowAddNote(true);
                  }}
                  onDelete={deleteNote}
                  onUpdateStatus={handleUpdateNoteStatus}
                  onToggleChecklistItem={handleToggleChecklistItem}
                  language={language}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Collapsible Knowledge Pool Details */}
      <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
        {/* Header */}
        <div
          className="px-4 py-3 cursor-pointer flex items-center justify-between hover:bg-amber-50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900">
                {language === 'de' ? 'Projekt-Wissensdatenbank' : 'Project Knowledge Base'}
              </h3>
              <p className="text-xs text-amber-600">
                {language === 'de'
                  ? 'Dokumente & Websites verwalten'
                  : 'Manage documents & websites'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {totalItems > 0 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                {totalItems} {language === 'de' ? 'Einträge' : 'items'}
              </Badge>
            )}
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-amber-500" />
            ) : (
              <ChevronRight className="h-5 w-5 text-amber-500" />
            )}
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="px-4 pb-4 space-y-4 border-t border-amber-100">
            {/* Search */}
            <div className="relative pt-4">
              <Search className="absolute left-3 top-1/2 mt-2 -translate-y-1/2 h-4 w-4 text-amber-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'de' ? 'Wissen durchsuchen...' : 'Search knowledge...'}
                className="pl-9 bg-amber-50/50 border-amber-200 focus:border-amber-400"
              />
            </div>

            {/* Tabs - Only Documents and Websites (Notes shown above) */}
            <div className="flex gap-1 p-1 bg-amber-100 rounded-lg">
              {[
                { key: 'documents', icon: FileText, label: language === 'de' ? 'Dokumente' : 'Documents', count: filteredDocuments.length },
                { key: 'websites', icon: Globe, label: language === 'de' ? 'Websites' : 'Websites', count: filteredWebsites.length },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-white text-amber-900 shadow-sm'
                      : 'text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="text-xs bg-amber-200 text-amber-800 px-1.5 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Documents Tab */}
            {activeTab === 'documents' && (
            <div className="space-y-3">
              {/* Upload Area */}
              <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-amber-300 rounded-lg bg-white hover:bg-amber-50 cursor-pointer transition-colors">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.txt"
                  className="hidden"
                  onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                  disabled={isUploading}
                />
                {isUploading ? (
                  <RefreshCw className="h-5 w-5 text-amber-600 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5 text-amber-600" />
                )}
                <span className="text-sm text-amber-700">
                  {language === 'de'
                    ? 'PDF, DOCX, DOC oder TXT hochladen'
                    : 'Upload PDF, DOCX, DOC or TXT'}
                </span>
              </label>

              {/* Document List */}
              {filteredDocuments.length === 0 ? (
                <p className="text-center text-sm text-amber-600 py-4">
                  {language === 'de' ? 'Noch keine Dokumente' : 'No documents yet'}
                </p>
              ) : (
                <div className="space-y-4">
                  {filteredDocuments.map(doc => (
                    <div
                      key={doc.id}
                      className={`rounded-xl border-2 overflow-hidden transition-all ${
                        doc.status === 'ready'
                          ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300 shadow-md'
                          : doc.status === 'uploading' || doc.status === 'processing'
                          ? 'bg-blue-50 border-blue-200 animate-pulse'
                          : doc.status === 'error'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-white border-amber-200'
                      }`}
                    >
                      {/* Document Header - Clickable to expand */}
                      <div
                        className="px-4 py-3 flex items-center justify-between bg-white/60 cursor-pointer hover:bg-white/80 transition-colors"
                        onClick={() => doc.status === 'ready' && setExpandedItems(prev => ({ ...prev, [`doc-${doc.id}`]: !prev[`doc-${doc.id}`] }))}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`p-2 rounded-lg ${
                            doc.status === 'ready' ? 'bg-green-100' :
                            doc.status === 'uploading' || doc.status === 'processing' ? 'bg-blue-100' :
                            doc.status === 'error' ? 'bg-red-100' : 'bg-amber-100'
                          }`}>
                            <File className={`h-5 w-5 ${
                              doc.status === 'ready' ? 'text-green-600' :
                              doc.status === 'uploading' || doc.status === 'processing' ? 'text-blue-600' :
                              doc.status === 'error' ? 'text-red-600' : 'text-amber-600'
                            }`} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-amber-900 truncate">
                              {doc.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  doc.category === 'partner_info' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  doc.category === 'study' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                  doc.category === 'previous_project' ? 'bg-green-50 text-green-700 border-green-200' :
                                  'bg-gray-50 text-gray-700 border-gray-200'
                                }`}
                              >
                                {doc.category === 'partner_info' ? '🏢 ' :
                                 doc.category === 'study' ? '📊 ' :
                                 doc.category === 'previous_project' ? '📁 ' : ''}
                                {labels[doc.category] || doc.category}
                              </Badge>
                              {doc.status === 'uploading' && (
                                <span className="flex items-center gap-1 text-[10px] text-blue-600">
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                  {language === 'de' ? 'Hochladen...' : 'Uploading...'}
                                </span>
                              )}
                              {doc.status === 'processing' && (
                                <span className="flex items-center gap-1 text-[10px] text-blue-600">
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                  {language === 'de' ? 'Analysiere...' : 'Analyzing...'}
                                </span>
                              )}
                              {doc.status === 'ready' && (
                                <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
                                  <Check className="h-3 w-3" />
                                  {language === 'de' ? 'Bereit' : 'Ready'}
                                </span>
                              )}
                              {doc.status === 'error' && (
                                <span className="flex items-center gap-1 text-[10px] text-red-600">
                                  <AlertTriangle className="h-3 w-3" />
                                  {language === 'de' ? 'Fehler' : 'Error'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteDocument(doc.id);
                            }}
                            className="p-2 hover:bg-red-100 rounded-lg text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          {doc.status === 'ready' && (
                            expandedItems[`doc-${doc.id}`] ? (
                              <ChevronDown className="h-5 w-5 text-amber-500" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-amber-500" />
                            )
                          )}
                        </div>
                      </div>

                      {/* AI Analysis - Only visible when expanded */}
                      {doc.status === 'ready' && expandedItems[`doc-${doc.id}`] && (
                        <div className="px-4 pb-4 space-y-3">
                          {/* Loading state during analysis */}
                          {analyzingDocId === doc.id && (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border-2 border-blue-300 animate-pulse">
                              <div className="flex flex-col items-center justify-center gap-3">
                                <div className="relative">
                                  <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
                                  <Sparkles className="h-4 w-4 text-amber-500 absolute -top-1 -right-1" />
                                </div>
                                <div className="text-center">
                                  <p className="text-sm font-semibold text-blue-800">
                                    {language === 'de' ? '🤖 KI analysiert Dokument...' : '🤖 AI analyzing document...'}
                                  </p>
                                  <p className="text-xs text-blue-600 mt-1">
                                    {language === 'de'
                                      ? 'Extrahiere Zielgruppen, Kompetenzen, Projekte...'
                                      : 'Extracting target groups, competences, projects...'}
                                  </p>
                                  <p className="text-[10px] text-blue-500 mt-2">
                                    {language === 'de' ? '(kann bis zu 60 Sekunden dauern)' : '(may take up to 60 seconds)'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* No analysis yet - show button to generate */}
                          {!doc.summary && !doc.aiAnalysis && analyzingDocId !== doc.id && (
                            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-4 border-2 border-dashed border-amber-300">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-amber-800">
                                    {language === 'de' ? '📄 Keine KI-Analyse vorhanden' : '📄 No AI analysis available'}
                                  </p>
                                  <p className="text-xs text-amber-600 mt-1">
                                    {doc.extractedText
                                      ? (language === 'de' ? `${doc.extractedText.length.toLocaleString()} Zeichen extrahiert` : `${doc.extractedText.length.toLocaleString()} characters extracted`)
                                      : (language === 'de' ? 'Kein Text extrahiert' : 'No text extracted')
                                    }
                                  </p>
                                </div>
                                {doc.extractedText && doc.extractedText.length > 100 && (
                                  <Button
                                    size="sm"
                                    disabled={analyzingDocId !== null}
                                    onClick={async () => {
                                      console.log('[KnowledgePool] Regenerating analysis for:', doc.name);
                                      setAnalyzingDocId(doc.id);
                                      const analyzeController = new AbortController();
                                      const analyzeTimeoutId = setTimeout(() => analyzeController.abort(), 60000); // 60s timeout
                                      try {
                                        const response = await fetch('/api/summarize-study', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            documentText: doc.extractedText!.slice(0, 15000),
                                            documentName: doc.name,
                                            documentType: 'study',
                                            language,
                                          }),
                                          signal: analyzeController.signal,
                                        });
                                        clearTimeout(analyzeTimeoutId);

                                        if (response.ok) {
                                          const data = await response.json();
                                          const newSummary = data.summary?.executiveSummary || '';
                                          const rawFindings = data.summary?.keyFindings || [];
                                          const newKeyFindings = rawFindings.map((f: string | { finding: string }) => {
                                            if (typeof f === 'string') return f;
                                            if (typeof f === 'object' && f.finding) return f.finding;
                                            return JSON.stringify(f);
                                          });

                                          const newAiAnalysis = {
                                            organizationName: data.summary?.title,
                                            mission: data.summary?.mission,
                                            staffSize: data.summary?.staffSize,
                                            erasmusData: data.summary?.erasmusData,
                                            competences: data.summary?.competences,
                                            targetGroups: data.summary?.targetGroups,
                                            relevantSectors: data.summary?.relevantSectors,
                                            completedProjects: data.summary?.completedProjects,
                                            statistics: data.summary?.statistics,
                                            recommendations: data.summary?.recommendations,
                                            usefulForProposal: data.summary?.usefulForProposal,
                                            keyTerms: data.summary?.keyTerms,
                                          };

                                          const updatedDoc = { ...doc, summary: newSummary, keyFindings: newKeyFindings, aiAnalysis: newAiAnalysis };
                                          const latestPool = knowledgePoolRef.current;
                                          const updatedDocs = (latestPool.documents || []).map(d =>
                                            d.id === doc.id ? updatedDoc : d
                                          );
                                          const newPool = { ...latestPool, documents: updatedDocs };
                                          knowledgePoolRef.current = newPool;
                                          onUpdate(newPool);
                                          setHasUnsavedChanges(true);
                                        } else {
                                          const errorData = await response.json().catch(() => ({}));
                                          alert(language === 'de'
                                            ? `Fehler: ${errorData.error || response.status}`
                                            : `Error: ${errorData.error || response.status}`);
                                        }
                                      } catch (e: any) {
                                        clearTimeout(analyzeTimeoutId);
                                        if (e.name === 'AbortError') {
                                          console.warn('[KnowledgePool] Analysis timeout (60s) for:', doc.name);
                                          alert(language === 'de'
                                            ? 'Analyse-Timeout: Die KI-Analyse hat zu lange gedauert. Bitte erneut versuchen.'
                                            : 'Analysis timeout: AI analysis took too long. Please try again.');
                                        } else {
                                          console.error('[KnowledgePool] Analysis failed:', e);
                                          alert(language === 'de' ? 'Analyse fehlgeschlagen' : 'Analysis failed');
                                        }
                                      } finally {
                                        setAnalyzingDocId(null);
                                      }
                                    }}
                                    className="bg-amber-500 hover:bg-amber-600 text-white"
                                  >
                                    <Sparkles className="h-4 w-4 mr-1" />
                                    {language === 'de' ? 'Jetzt analysieren' : 'Analyze now'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}

                          {/* STRUCTURED ANALYSIS DISPLAY */}
                          {(doc.summary || doc.aiAnalysis) && (
                            <div className="space-y-3">
                              {/* Executive Summary */}
                              {doc.summary && (
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="h-4 w-4 text-blue-600" />
                                    <h5 className="text-xs font-bold text-blue-800 uppercase tracking-wide">
                                      {language === 'de' ? 'Zusammenfassung' : 'Summary'}
                                    </h5>
                                  </div>
                                  <p className="text-sm text-gray-700 leading-relaxed">{doc.summary}</p>
                                </div>
                              )}

                              {/* Grid Layout for Structured Data */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Organization Info (if PIF) */}
                                {(doc.aiAnalysis?.organizationName || doc.aiAnalysis?.mission || doc.aiAnalysis?.staffSize) && (
                                  <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Building2 className="h-4 w-4 text-purple-600" />
                                      <h5 className="text-xs font-bold text-purple-800 uppercase">
                                        {language === 'de' ? 'Organisation' : 'Organization'}
                                      </h5>
                                    </div>
                                    <div className="space-y-1.5">
                                      {doc.aiAnalysis.organizationName && (
                                        <p className="text-sm font-medium text-gray-900">{doc.aiAnalysis.organizationName}</p>
                                      )}
                                      {doc.aiAnalysis.staffSize && (
                                        <div className="flex items-center gap-2 text-xs text-gray-600">
                                          <Users className="h-3 w-3" />
                                          <span>{language === 'de' ? 'Mitarbeiter:' : 'Staff:'} <strong>{doc.aiAnalysis.staffSize}</strong></span>
                                        </div>
                                      )}
                                      {doc.aiAnalysis.mission && (
                                        <p className="text-xs text-gray-600 italic">&ldquo;{doc.aiAnalysis.mission}&rdquo;</p>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Erasmus+ IDs */}
                                {doc.aiAnalysis?.erasmusData && (doc.aiAnalysis.erasmusData.oid || doc.aiAnalysis.erasmusData.pic) && (
                                  <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Hash className="h-4 w-4 text-blue-600" />
                                      <h5 className="text-xs font-bold text-blue-800 uppercase">Erasmus+ IDs</h5>
                                    </div>
                                    <div className="space-y-1">
                                      {doc.aiAnalysis.erasmusData.oid && (
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="text-xs font-mono">OID</Badge>
                                          <span className="text-sm font-medium">{doc.aiAnalysis.erasmusData.oid}</span>
                                        </div>
                                      )}
                                      {doc.aiAnalysis.erasmusData.pic && (
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="text-xs font-mono">PIC</Badge>
                                          <span className="text-sm font-medium">{doc.aiAnalysis.erasmusData.pic}</span>
                                        </div>
                                      )}
                                      {doc.aiAnalysis.erasmusData.accreditation && (
                                        <div className="flex items-center gap-2">
                                          <Award className="h-3 w-3 text-green-600" />
                                          <span className="text-xs text-green-700">{doc.aiAnalysis.erasmusData.accreditation}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Target Groups */}
                                {doc.aiAnalysis?.targetGroups && doc.aiAnalysis.targetGroups.length > 0 && (
                                  <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Target className="h-4 w-4 text-orange-600" />
                                      <h5 className="text-xs font-bold text-orange-800 uppercase">
                                        {language === 'de' ? 'Zielgruppen' : 'Target Groups'}
                                      </h5>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {doc.aiAnalysis.targetGroups.map((tg, i) => (
                                        <Badge key={i} variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                                          {tg}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Competences */}
                                {doc.aiAnalysis?.competences && doc.aiAnalysis.competences.length > 0 && (
                                  <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Award className="h-4 w-4 text-green-600" />
                                      <h5 className="text-xs font-bold text-green-800 uppercase">
                                        {language === 'de' ? 'Kompetenzen' : 'Competences'}
                                      </h5>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {doc.aiAnalysis.competences.map((c, i) => (
                                        <Badge key={i} variant="secondary" className="text-xs bg-green-100 text-green-800">
                                          {c}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Relevant Sectors */}
                                {doc.aiAnalysis?.relevantSectors && doc.aiAnalysis.relevantSectors.length > 0 && (
                                  <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                      <GraduationCap className="h-4 w-4 text-indigo-600" />
                                      <h5 className="text-xs font-bold text-indigo-800 uppercase">
                                        {language === 'de' ? 'Sektoren' : 'Sectors'}
                                      </h5>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {doc.aiAnalysis.relevantSectors.map((s, i) => (
                                        <Badge key={i} className="text-xs bg-indigo-100 text-indigo-800">
                                          {s === 'ADU' ? '👨‍🎓 Erwachsenenbildung' :
                                           s === 'VET' ? '🔧 Berufsbildung' :
                                           s === 'SCH' ? '🏫 Schulbildung' :
                                           s === 'YOU' ? '👶 Jugend' :
                                           s === 'HED' ? '🎓 Hochschule' :
                                           s === 'SPO' ? '⚽ Sport' : s}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Previous Projects - Full width */}
                              {doc.aiAnalysis?.completedProjects && doc.aiAnalysis.completedProjects.length > 0 && (
                                <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Briefcase className="h-4 w-4 text-teal-600" />
                                    <h5 className="text-xs font-bold text-teal-800 uppercase">
                                      {language === 'de' ? 'Bisherige Projekte' : 'Previous Projects'}
                                    </h5>
                                    <Badge variant="outline" className="text-[10px]">
                                      {doc.aiAnalysis.completedProjects.length}
                                    </Badge>
                                  </div>
                                  <div className="space-y-2">
                                    {doc.aiAnalysis.completedProjects.slice(0, 5).map((proj, i) => (
                                      <div key={i} className="flex items-start gap-2 text-xs p-2 bg-teal-50 rounded">
                                        <Badge variant={proj.role === 'COORDINATOR' ? 'default' : 'secondary'} className="text-[9px] shrink-0">
                                          {proj.role === 'COORDINATOR' ? '🎯 COORD' : '🤝 PARTNER'}
                                        </Badge>
                                        <div className="min-w-0">
                                          <p className="font-medium text-teal-900 truncate">{proj.title}</p>
                                          <p className="text-teal-600">
                                            {proj.programme} {proj.year && `(${proj.year})`}
                                            {proj.topic && ` • ${proj.topic}`}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Key Findings */}
                              {doc.keyFindings && doc.keyFindings.length > 0 && (
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Lightbulb className="h-4 w-4 text-green-600" />
                                    <h5 className="text-xs font-bold text-green-800 uppercase">
                                      {language === 'de' ? 'Wichtige Erkenntnisse' : 'Key Findings'}
                                    </h5>
                                  </div>
                                  <ul className="space-y-1.5">
                                    {doc.keyFindings.slice(0, 5).map((finding, i) => (
                                      <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                                        <span className="shrink-0 w-4 h-4 rounded-full bg-green-200 text-green-700 flex items-center justify-center text-[10px] font-bold">
                                          {i + 1}
                                        </span>
                                        <span>{finding}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Statistics */}
                              {doc.aiAnalysis?.statistics && doc.aiAnalysis.statistics.length > 0 && (
                                <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                  <div className="flex items-center gap-2 mb-2">
                                    <BarChart3 className="h-4 w-4 text-blue-600" />
                                    <h5 className="text-xs font-bold text-blue-800 uppercase">
                                      {language === 'de' ? 'Statistiken' : 'Statistics'}
                                    </h5>
                                  </div>
                                  <div className="space-y-2">
                                    {doc.aiAnalysis.statistics.slice(0, 4).map((stat, i) => (
                                      <div key={i} className="text-xs p-2 bg-blue-50 rounded">
                                        <p className="font-medium text-blue-900">{stat.metric}</p>
                                        <p className="text-blue-600">{stat.context}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Recommendations */}
                              {doc.aiAnalysis?.recommendations && doc.aiAnalysis.recommendations.length > 0 && (
                                <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                  <div className="flex items-center gap-2 mb-2">
                                    <BookOpen className="h-4 w-4 text-purple-600" />
                                    <h5 className="text-xs font-bold text-purple-800 uppercase">
                                      {language === 'de' ? 'Empfehlungen' : 'Recommendations'}
                                    </h5>
                                  </div>
                                  <ul className="space-y-1">
                                    {doc.aiAnalysis.recommendations.slice(0, 4).map((rec, i) => (
                                      <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                                        <span className="text-purple-500">→</span>
                                        <span>{rec}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Key Terms */}
                              {doc.aiAnalysis?.keyTerms && doc.aiAnalysis.keyTerms.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-100">
                                  {doc.aiAnalysis.keyTerms.map((term, i) => (
                                    <Badge key={i} variant="outline" className="text-[10px] text-gray-500">
                                      #{term}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Show extracted text toggle */}
                          {doc.extractedText && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedItems(prev => ({ ...prev, [`text-${doc.id}`]: !prev[`text-${doc.id}`] }));
                              }}
                              className="flex items-center gap-2 text-xs text-amber-600 hover:text-amber-800 transition-colors"
                            >
                              {expandedItems[`text-${doc.id}`] ? (
                                <>
                                  <ChevronDown className="h-3 w-3" />
                                  {language === 'de' ? 'Volltext ausblenden' : 'Hide full text'}
                                </>
                              ) : (
                                <>
                                  <ChevronRight className="h-3 w-3" />
                                  {language === 'de' ? `Volltext anzeigen (${doc.extractedText.length.toLocaleString()} Zeichen)` : `Show full text (${doc.extractedText.length.toLocaleString()} chars)`}
                                </>
                              )}
                            </button>
                          )}

                          {/* Expanded: Full extracted text */}
                          {expandedItems[`text-${doc.id}`] && doc.extractedText && (
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 max-h-60 overflow-y-auto">
                              <h5 className="text-[10px] font-semibold text-gray-500 uppercase mb-2">
                                {language === 'de' ? 'Extrahierter Text' : 'Extracted Text'}
                              </h5>
                              <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                                {doc.extractedText.slice(0, 5000)}
                                {doc.extractedText.length > 5000 && '...'}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Error message */}
                      {doc.status === 'error' && doc.error && (
                        <div className="px-4 pb-3">
                          <p className="text-xs text-red-600">{doc.error}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Websites Tab */}
          {activeTab === 'websites' && (
            <div className="space-y-3">
              {/* Add Website */}
              <div className="flex gap-2">
                <Input
                  value={newWebsiteUrl}
                  onChange={(e) => setNewWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1 bg-white"
                />
                <Select
                  value={newWebsiteCategory}
                  onValueChange={(v) => setNewWebsiteCategory(v as KnowledgeWebsite['category'])}
                >
                  <SelectTrigger className="w-36 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="partner_website">{labels.partner_website}</SelectItem>
                    <SelectItem value="project_website">{labels.project_website}</SelectItem>
                    <SelectItem value="reference">{labels.reference}</SelectItem>
                    <SelectItem value="statistics">{labels.statistics}</SelectItem>
                    <SelectItem value="other">{labels.other}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleFetchWebsite}
                  disabled={isFetching || !newWebsiteUrl.trim()}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {isFetching ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Website List */}
              {filteredWebsites.length === 0 ? (
                <p className="text-center text-sm text-amber-600 py-4">
                  {language === 'de' ? 'Noch keine Websites' : 'No websites yet'}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredWebsites.map(website => (
                    <div
                      key={website.id}
                      className="bg-white rounded-lg border border-amber-200 overflow-hidden"
                    >
                      <div
                        className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-amber-50"
                        onClick={() => setExpandedItems(prev => ({ ...prev, [website.id]: !prev[website.id] }))}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Globe className="h-4 w-4 text-blue-600 shrink-0" />
                          <span className="text-sm font-medium text-amber-900 truncate">
                            {website.title || website.url}
                          </span>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {labels[website.category] || website.category}
                          </Badge>
                          {website.status === 'fetching' && (
                            <RefreshCw className="h-3 w-3 text-amber-500 animate-spin" />
                          )}
                          {website.status === 'ready' && (
                            <Check className="h-3 w-3 text-green-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <a
                            href={website.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 hover:bg-blue-100 rounded text-blue-500"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteWebsite(website.id);
                            }}
                            className="p-1 hover:bg-red-100 rounded text-red-500"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                          {expandedItems[website.id] ? (
                            <ChevronDown className="h-4 w-4 text-amber-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                      </div>

                      {expandedItems[website.id] && website.status === 'ready' && (
                        <div className="px-3 pb-3 pt-1 border-t border-amber-100 space-y-2">
                          {website.summary && (
                            <div>
                              <h5 className="text-[10px] font-semibold text-amber-700 uppercase mb-1">
                                {language === 'de' ? 'Zusammenfassung' : 'Summary'}
                              </h5>
                              <p className="text-xs text-gray-700">{website.summary}</p>
                            </div>
                          )}
                          {website.keyPoints && website.keyPoints.length > 0 && (
                            <div>
                              <h5 className="text-[10px] font-semibold text-amber-700 uppercase mb-1">
                                {language === 'de' ? 'Wichtige Punkte' : 'Key Points'}
                              </h5>
                              <ul className="text-xs text-gray-700 space-y-1">
                                {website.keyPoints.slice(0, 5).map((p, i) => (
                                  <li key={i} className="flex items-start gap-1">
                                    <span className="text-amber-500">•</span>
                                    <span>{typeof p === 'string' ? p : JSON.stringify(p)}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}
      </div>
    </div>
  );
}

export type { ProjectKnowledgePoolProps };
