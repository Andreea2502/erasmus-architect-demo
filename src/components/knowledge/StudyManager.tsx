'use client';

/**
 * Study Manager Component
 * =======================
 * Ermöglicht das Hochladen von Studien, Statistiken und Dokumenten
 * mit automatischer KI-Zusammenfassung der wichtigsten Erkenntnisse
 */

import React, { useState, useCallback } from 'react';
import { StudySummary, Sector, SECTOR_LABELS } from '@/store/types';
import { extractTextFromPDF } from '@/lib/rag-system';

interface UploadedStudy {
  id: string;
  fileName: string;
  fileType: 'study' | 'statistics' | 'programme_guide' | 'other';
  uploadedAt: Date;
  status: 'uploading' | 'analyzing' | 'ready' | 'error';
  progress: number;
  error?: string;
  summary?: StudySummary;
  textContent?: string;
}

interface StudyManagerProps {
  studies: UploadedStudy[];
  onStudiesChange: (studies: UploadedStudy[]) => void;
  language?: string;
}

export default function StudyManager({
  studies,
  onStudiesChange,
  language = 'de'
}: StudyManagerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [expandedStudy, setExpandedStudy] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<UploadedStudy['fileType']>('study');
  const [localStudies, setLocalStudies] = useState<UploadedStudy[]>([]);

  // Sync local studies with props (only when props change externally)
  const studiesRef = React.useRef(studies);
  React.useEffect(() => {
    if (JSON.stringify(studiesRef.current) !== JSON.stringify(studies)) {
      studiesRef.current = studies;
      setLocalStudies(studies);
    }
  }, [studies]);

  // Handle file upload
  const handleFiles = useCallback(async (files: FileList) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const studyId = `study-${Date.now()}-${i}`;

      // Add initial entry
      const newStudy: UploadedStudy = {
        id: studyId,
        fileName: file.name,
        fileType: selectedType,
        uploadedAt: new Date(),
        status: 'uploading',
        progress: 10,
      };

      // Use functional update and schedule parent update
      setLocalStudies(prev => {
        const updated = [...prev, newStudy];
        // Schedule callback for next tick to avoid setState during render
        setTimeout(() => onStudiesChange(updated), 0);
        return updated;
      });

      try {
        // Extract text from PDF
        let textContent = '';

        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          setLocalStudies(prev => {
            const updated = prev.map(s => s.id === studyId ? { ...s, status: 'uploading' as const, progress: 30 } : s);
            setTimeout(() => onStudiesChange(updated), 0);
            return updated;
          });
          const { text } = await extractTextFromPDF(file);
          textContent = text;
        } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
          textContent = await file.text();
        } else {
          throw new Error(`Nicht unterstützter Dateityp: ${file.type}`);
        }

        setLocalStudies(prev => {
          const updated = prev.map(s => s.id === studyId ? { ...s, status: 'analyzing' as const, progress: 50, textContent } : s);
          setTimeout(() => onStudiesChange(updated), 0);
          return updated;
        });

        // Call summary API
        const response = await fetch('/api/summarize-study', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentText: textContent,
            documentName: file.name,
            documentType: selectedType,
            language,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Zusammenfassung fehlgeschlagen');
        }

        const data = await response.json();

        setLocalStudies(prev => {
          const updated = prev.map(s => s.id === studyId ? {
            ...s,
            status: 'ready' as const,
            progress: 100,
            summary: {
              id: `summary-${studyId}`,
              documentId: studyId,
              documentName: file.name,
              documentType: selectedType,
              ...data.summary,
              analyzedAt: new Date(),
              textLength: textContent.length,
            },
          } : s);
          setTimeout(() => onStudiesChange(updated), 0);
          return updated;
        });

      } catch (error) {
        setLocalStudies(prev => {
          const updated = prev.map(s => s.id === studyId ? {
            ...s,
            status: 'error' as const,
            progress: 0,
            error: (error as Error).message,
          } : s);
          setTimeout(() => onStudiesChange(updated), 0);
          return updated;
        });
      }
    }

    setIsUploading(false);
  }, [selectedType, language, onStudiesChange]);

  // Remove study
  const removeStudy = (id: string) => {
    const updated = localStudies.filter(s => s.id !== id);
    setLocalStudies(updated);
    onStudiesChange(updated);
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-2xl">📚</span>
          Wissensbasis - Studien & Dokumente
        </h3>

        {/* Document Type Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dokumenttyp
          </label>
          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'study', label: '📊 Studie', desc: 'Wissenschaftliche Studien' },
              { value: 'statistics', label: '📈 Statistik', desc: 'Statistische Berichte' },
              { value: 'programme_guide', label: '📖 Leitfaden', desc: 'Programme Guides' },
              { value: 'other', label: '📄 Andere', desc: 'Sonstige Dokumente' },
            ].map(type => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value as UploadedStudy['fileType'])}
                className={`px-4 py-2 rounded-lg border transition-all ${selectedType === type.value
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                title={type.desc}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Drop Zone */}
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
            }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            accept=".pdf,.txt"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />
          <div className="space-y-2">
            <div className="text-4xl">📁</div>
            <p className="text-gray-600">
              {isUploading
                ? 'Wird verarbeitet...'
                : 'PDF- oder TXT-Dateien hierher ziehen oder klicken'}
            </p>
            <p className="text-sm text-gray-400">
              Die KI analysiert automatisch die wichtigsten Erkenntnisse
            </p>
          </div>
        </div>
      </div>

      {/* Uploaded Studies List */}
      {localStudies.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-md font-semibold text-gray-800">
            Hochgeladene Dokumente ({localStudies.length})
          </h4>

          {localStudies.map(study => (
            <div
              key={study.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              {/* Header */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedStudy(
                  expandedStudy === study.id ? null : study.id
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {study.fileType === 'study' && '📊'}
                    {study.fileType === 'statistics' && '📈'}
                    {study.fileType === 'programme_guide' && '📖'}
                    {study.fileType === 'other' && '📄'}
                  </span>
                  <div>
                    <h5 className="font-medium text-gray-900">
                      {study.summary?.title || study.fileName}
                    </h5>
                    <p className="text-sm text-gray-500">
                      {study.summary?.authors?.join(', ')}
                      {study.summary?.year && ` (${study.summary.year})`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Status Badge */}
                  {study.status === 'uploading' && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm flex items-center gap-1">
                      <span className="animate-spin">⏳</span> Wird geladen...
                    </span>
                  )}
                  {study.status === 'analyzing' && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1">
                      <span className="animate-pulse">🤖</span> KI analysiert...
                    </span>
                  )}
                  {study.status === 'ready' && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                      ✓ Bereit
                    </span>
                  )}
                  {study.status === 'error' && (
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                      ⚠ Fehler
                    </span>
                  )}

                  {/* Expand/Collapse */}
                  <span className={`text-gray-400 transition-transform ${expandedStudy === study.id ? 'rotate-180' : ''
                    }`}>
                    ▼
                  </span>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeStudy(study.id);
                    }}
                    className="text-gray-400 hover:text-red-500 p-1"
                    title="Entfernen"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              {(study.status === 'uploading' || study.status === 'analyzing') && (
                <div className="px-4 pb-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${study.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Message */}
              {study.status === 'error' && study.error && (
                <div className="px-4 pb-4">
                  <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                    {study.error}
                  </p>
                </div>
              )}

              {/* Expanded Content - Summary */}
              {expandedStudy === study.id && study.summary && (
                <div className="border-t border-gray-200 p-4 space-y-6 bg-gray-50">
                  {/* Executive Summary */}
                  <div>
                    <h6 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <span>📋</span> Zusammenfassung
                    </h6>
                    <p className="text-gray-700 bg-white p-3 rounded-lg border">
                      {study.summary.executiveSummary}
                    </p>
                  </div>

                  {/* Key Findings */}
                  {study.summary.keyFindings && study.summary.keyFindings.length > 0 && (
                    <div>
                      <h6 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        <span>💡</span> Wichtigste Erkenntnisse
                      </h6>
                      <div className="space-y-3">
                        {study.summary.keyFindings.map((finding, idx) => (
                          <div key={idx} className="bg-white p-4 rounded-lg border">
                            <p className="font-medium text-gray-900">{finding.finding}</p>
                            <p className="text-sm text-blue-600 mt-1">
                              Relevanz: {finding.relevance}
                            </p>
                            {finding.quotable && (
                              <p className="text-sm text-gray-500 mt-2 italic border-l-4 border-gray-300 pl-3">
                                &ldquo;{finding.quotable}&rdquo;
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Statistics */}
                  {study.summary.statistics && study.summary.statistics.length > 0 && (
                    <div>
                      <h6 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        <span>📊</span> Statistiken & Zahlen
                      </h6>
                      <div className="grid gap-3 md:grid-cols-2">
                        {study.summary.statistics.map((stat, idx) => (
                          <div key={idx} className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                            <p className="font-semibold text-blue-900">{stat.metric}</p>
                            <p className="text-sm text-gray-600 mt-1">{stat.context}</p>
                            {stat.source && (
                              <p className="text-xs text-gray-400 mt-1">Quelle: {stat.source}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {study.summary.recommendations && study.summary.recommendations.length > 0 && (
                    <div>
                      <h6 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        <span>✅</span> Empfehlungen
                      </h6>
                      <ul className="list-disc list-inside space-y-1 text-gray-700 bg-white p-4 rounded-lg border">
                        {study.summary.recommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Useful for Proposal */}
                  {study.summary.usefulForProposal && (
                    <div>
                      <h6 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        <span>🎯</span> Nutzbar für Antrag
                      </h6>
                      <div className="grid gap-3 md:grid-cols-2">
                        {study.summary.usefulForProposal.needsAnalysis && (
                          <div className="bg-white p-3 rounded-lg border">
                            <span className="text-sm font-medium text-gray-500">Bedarfsanalyse</span>
                            <p className="text-gray-700">{study.summary.usefulForProposal.needsAnalysis}</p>
                          </div>
                        )}
                        {study.summary.usefulForProposal.methodology && (
                          <div className="bg-white p-3 rounded-lg border">
                            <span className="text-sm font-medium text-gray-500">Methodik</span>
                            <p className="text-gray-700">{study.summary.usefulForProposal.methodology}</p>
                          </div>
                        )}
                        {study.summary.usefulForProposal.impact && (
                          <div className="bg-white p-3 rounded-lg border">
                            <span className="text-sm font-medium text-gray-500">Impact</span>
                            <p className="text-gray-700">{study.summary.usefulForProposal.impact}</p>
                          </div>
                        )}
                        {study.summary.usefulForProposal.dissemination && (
                          <div className="bg-white p-3 rounded-lg border">
                            <span className="text-sm font-medium text-gray-500">Dissemination</span>
                            <p className="text-gray-700">{study.summary.usefulForProposal.dissemination}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Target Groups & Sectors */}
                  <div className="flex flex-wrap gap-4">
                    {study.summary.targetGroups && study.summary.targetGroups.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Zielgruppen</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {study.summary.targetGroups.map((tg, idx) => (
                            <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                              {tg}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {study.summary.relevantSectors && study.summary.relevantSectors.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Sektoren</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {study.summary.relevantSectors.map((sector, idx) => (
                            <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                              {SECTOR_LABELS[sector as Sector] || sector}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {study.summary.keyTerms && study.summary.keyTerms.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Schlüsselbegriffe</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {study.summary.keyTerms.map((term, idx) => (
                            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                              {term}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Limitations */}
                  {study.summary.limitations && (
                    <div className="text-sm text-gray-500 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <span className="font-medium">⚠️ Einschränkungen: </span>
                      {study.summary.limitations}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {localStudies.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📚</div>
          <p>Noch keine Dokumente hochgeladen</p>
          <p className="text-sm">Laden Sie Studien, Statistiken oder den Programme Guide hoch</p>
        </div>
      )}
    </div>
  );
}

// Export type for use in parent components
export type { UploadedStudy };
