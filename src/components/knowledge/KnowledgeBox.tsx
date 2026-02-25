'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  FileText,
  Globe,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Lightbulb,
  Quote,
  Copy,
  Check
} from 'lucide-react';
import type { KnowledgeDocument, KnowledgeWebsite, KnowledgeNote } from '@/store/types';

interface KnowledgeBoxProps {
  documents: KnowledgeDocument[];
  websites: KnowledgeWebsite[];
  notes: KnowledgeNote[];
  questionContext?: string; // Optional context to filter relevant items
  language?: 'de' | 'en';
  onUseContent?: (content: string) => void;
}

export function KnowledgeBox({
  documents,
  websites,
  notes,
  questionContext,
  language = 'de',
  onUseContent
}: KnowledgeBoxProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const readyDocuments = documents.filter(d => d.status === 'ready');
  const readyWebsites = websites.filter(w => w.status === 'ready');
  const allNotes = notes;

  const totalItems = readyDocuments.length + readyWebsites.length + allNotes.length;

  if (totalItems === 0) {
    return null;
  }

  const handleCopy = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const toggleItem = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-xl border border-amber-200 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-100/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-amber-900">
              {language === 'de' ? 'Wissensbox' : 'Knowledge Box'}
            </h3>
            <p className="text-xs text-amber-600">
              {totalItems} {language === 'de' ? 'Quellen verfügbar' : 'sources available'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {readyDocuments.length > 0 && (
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] rounded-full font-medium">
                {readyDocuments.length} {language === 'de' ? 'Dok.' : 'docs'}
              </span>
            )}
            {readyWebsites.length > 0 && (
              <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-[10px] rounded-full font-medium">
                {readyWebsites.length} {language === 'de' ? 'Web' : 'web'}
              </span>
            )}
            {allNotes.length > 0 && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] rounded-full font-medium">
                {allNotes.length} {language === 'de' ? 'Notizen' : 'notes'}
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-amber-600" />
          ) : (
            <ChevronDown className="h-4 w-4 text-amber-600" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Documents */}
          {readyDocuments.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {language === 'de' ? 'Dokumente' : 'Documents'}
              </h4>
              <div className="space-y-2">
                {readyDocuments.map(doc => (
                  <div
                    key={doc.id}
                    className="bg-white rounded-lg border border-indigo-100 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleItem(doc.id)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-indigo-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded bg-indigo-100 flex items-center justify-center shrink-0">
                          <FileText className="h-3 w-3 text-indigo-600" />
                        </div>
                        <span className="text-xs font-medium text-indigo-900 truncate">
                          {doc.name}
                        </span>
                      </div>
                      <ChevronDown className={`h-3 w-3 text-indigo-400 transition-transform ${expandedItems[doc.id] ? 'rotate-180' : ''}`} />
                    </button>

                    {expandedItems[doc.id] && (
                      <div className="px-3 pb-3 space-y-2 border-t border-indigo-50 bg-indigo-50/30">
                        {doc.summary && (
                          <div className="pt-2">
                            <p className="text-[10px] font-semibold text-indigo-600 uppercase mb-1">
                              {language === 'de' ? 'Zusammenfassung' : 'Summary'}
                            </p>
                            <p className="text-xs text-gray-700 leading-relaxed">
                              {doc.summary}
                            </p>
                          </div>
                        )}

                        {doc.keyFindings && doc.keyFindings.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-indigo-600 uppercase mb-1">
                              {language === 'de' ? 'Wichtige Erkenntnisse' : 'Key Findings'}
                            </p>
                            <ul className="space-y-1">
                              {doc.keyFindings.map((finding, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                                  <Lightbulb className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                                  <span>{finding}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                            onClick={() => handleCopy(
                              `${doc.name}:\n${doc.summary || ''}\n${doc.keyFindings?.join('\n') || ''}`,
                              doc.id
                            )}
                          >
                            {copiedId === doc.id ? (
                              <><Check className="h-2.5 w-2.5 mr-1" /> Kopiert</>
                            ) : (
                              <><Copy className="h-2.5 w-2.5 mr-1" /> Kopieren</>
                            )}
                          </Button>
                          {onUseContent && (
                            <Button
                              size="sm"
                              className="h-6 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white"
                              onClick={() => onUseContent(
                                `Basierend auf "${doc.name}":\n${doc.summary || ''}\n${doc.keyFindings?.join('\n') || ''}`
                              )}
                            >
                              <Quote className="h-2.5 w-2.5 mr-1" />
                              {language === 'de' ? 'Verwenden' : 'Use'}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Websites */}
          {readyWebsites.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-teal-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {language === 'de' ? 'Websites' : 'Websites'}
              </h4>
              <div className="space-y-2">
                {readyWebsites.map(website => (
                  <div
                    key={website.id}
                    className="bg-white rounded-lg border border-teal-100 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleItem(website.id)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-teal-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded bg-teal-100 flex items-center justify-center shrink-0">
                          <Globe className="h-3 w-3 text-teal-600" />
                        </div>
                        <span className="text-xs font-medium text-teal-900 truncate">
                          {website.title || website.url}
                        </span>
                      </div>
                      <ChevronDown className={`h-3 w-3 text-teal-400 transition-transform ${expandedItems[website.id] ? 'rotate-180' : ''}`} />
                    </button>

                    {expandedItems[website.id] && (
                      <div className="px-3 pb-3 space-y-2 border-t border-teal-50 bg-teal-50/30">
                        <div className="pt-2 flex items-center gap-2">
                          <a
                            href={website.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-teal-600 hover:text-teal-800 flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {website.url}
                          </a>
                        </div>

                        {website.summary && (
                          <div>
                            <p className="text-[10px] font-semibold text-teal-600 uppercase mb-1">
                              {language === 'de' ? 'Zusammenfassung' : 'Summary'}
                            </p>
                            <p className="text-xs text-gray-700 leading-relaxed">
                              {website.summary}
                            </p>
                          </div>
                        )}

                        {website.keyPoints && website.keyPoints.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-teal-600 uppercase mb-1">
                              {language === 'de' ? 'Wichtige Punkte' : 'Key Points'}
                            </p>
                            <ul className="space-y-1">
                              {website.keyPoints.map((point, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                                  <Lightbulb className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] border-teal-200 text-teal-700 hover:bg-teal-100"
                            onClick={() => handleCopy(
                              `${website.title || website.url}:\n${website.summary || ''}\n${website.keyPoints?.join('\n') || ''}`,
                              website.id
                            )}
                          >
                            {copiedId === website.id ? (
                              <><Check className="h-2.5 w-2.5 mr-1" /> Kopiert</>
                            ) : (
                              <><Copy className="h-2.5 w-2.5 mr-1" /> Kopieren</>
                            )}
                          </Button>
                          {onUseContent && (
                            <Button
                              size="sm"
                              className="h-6 text-[10px] bg-teal-600 hover:bg-teal-700 text-white"
                              onClick={() => onUseContent(
                                `Basierend auf "${website.title || website.url}":\n${website.summary || ''}\n${website.keyPoints?.join('\n') || ''}`
                              )}
                            >
                              <Quote className="h-2.5 w-2.5 mr-1" />
                              {language === 'de' ? 'Verwenden' : 'Use'}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes - Post-It Style */}
          {allNotes.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-purple-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Lightbulb className="h-3 w-3" />
                {language === 'de' ? 'Notizen' : 'Notes'}
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {allNotes.map(note => {
                  // Color styles for Post-It
                  const colorStyles: Record<string, { bg: string; border: string; text: string }> = {
                    yellow: { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-900' },
                    pink: { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-900' },
                    blue: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-900' },
                    green: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-900' },
                    purple: { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-900' },
                    orange: { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-900' },
                  };
                  const style = colorStyles[note.color || 'yellow'] || colorStyles.yellow;
                  const isDeadlinePast = note.deadline && new Date(note.deadline) < new Date();

                  return (
                    <div
                      key={note.id}
                      className={`rounded-lg border-2 overflow-hidden ${style.bg} ${style.border}`}
                    >
                      <button
                        onClick={() => toggleItem(note.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 transition-colors hover:opacity-80`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Priority indicator */}
                          <div className={`w-2 h-2 rounded-full shrink-0 ${
                            note.priority === 'urgent' ? 'bg-red-500 animate-pulse' :
                            note.priority === 'high' ? 'bg-orange-500' :
                            note.priority === 'medium' ? 'bg-blue-500' : 'bg-gray-400'
                          }`} />
                          <span className={`text-xs font-bold truncate ${style.text}`}>
                            {note.title}
                          </span>
                          {/* Status badge */}
                          {note.status && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                              note.status === 'done' ? 'bg-green-200 text-green-700' :
                              note.status === 'in_progress' ? 'bg-blue-200 text-blue-700' :
                              note.status === 'archived' ? 'bg-gray-200 text-gray-500' :
                              'bg-slate-200 text-slate-700'
                            }`}>
                              {note.status === 'done' ? '✓' :
                               note.status === 'in_progress' ? '▶' :
                               note.status === 'archived' ? '📁' : '○'}
                            </span>
                          )}
                          {/* Deadline indicator */}
                          {note.deadline && (
                            <span className={`text-[9px] ${isDeadlinePast ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                              📅 {new Date(note.deadline).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', { day: '2-digit', month: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <ChevronDown className={`h-3 w-3 ${style.text} opacity-50 transition-transform ${expandedItems[note.id] ? 'rotate-180' : ''}`} />
                      </button>

                      {expandedItems[note.id] && (
                        <div className={`px-3 pb-3 space-y-2 border-t ${style.border} bg-white/30`}>
                          <div className="pt-2">
                            <p
                              className={`text-xs leading-relaxed whitespace-pre-wrap ${style.text}`}
                              style={{
                                fontWeight: note.formatting?.bold ? 'bold' : 'normal',
                                fontStyle: note.formatting?.italic ? 'italic' : 'normal',
                                textDecoration: note.formatting?.underline ? 'underline' : 'none',
                                fontSize: note.formatting?.fontSize === 'small' ? '11px' :
                                         note.formatting?.fontSize === 'large' ? '14px' : '12px'
                              }}
                            >
                              {note.content}
                            </p>
                          </div>

                          {/* Checklist */}
                          {note.checklist && note.checklist.length > 0 && (
                            <div className="space-y-1 pt-1">
                              {note.checklist.map(item => (
                                <div key={item.id} className={`flex items-center gap-2 text-[10px] ${style.text}`}>
                                  <span>{item.checked ? '☑' : '☐'}</span>
                                  <span className={item.checked ? 'line-through opacity-50' : ''}>{item.text}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {note.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {note.tags.map((tag, i) => (
                                <span key={i} className={`px-1.5 py-0.5 ${style.bg} ${style.text} text-[9px] rounded`}>
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className={`h-6 text-[10px] ${style.border} ${style.text} hover:opacity-80`}
                              onClick={() => handleCopy(note.content, note.id)}
                            >
                              {copiedId === note.id ? (
                                <><Check className="h-2.5 w-2.5 mr-1" /> Kopiert</>
                              ) : (
                                <><Copy className="h-2.5 w-2.5 mr-1" /> Kopieren</>
                              )}
                            </Button>
                            {onUseContent && (
                              <Button
                                size="sm"
                                className={`h-6 text-[10px] ${
                                  note.color === 'yellow' ? 'bg-yellow-500 hover:bg-yellow-600' :
                                  note.color === 'pink' ? 'bg-pink-500 hover:bg-pink-600' :
                                  note.color === 'blue' ? 'bg-blue-500 hover:bg-blue-600' :
                                  note.color === 'green' ? 'bg-green-500 hover:bg-green-600' :
                                  note.color === 'purple' ? 'bg-purple-500 hover:bg-purple-600' :
                                  note.color === 'orange' ? 'bg-orange-500 hover:bg-orange-600' :
                                  'bg-amber-500 hover:bg-amber-600'
                                } text-white`}
                                onClick={() => onUseContent(note.content)}
                              >
                                <Quote className="h-2.5 w-2.5 mr-1" />
                                {language === 'de' ? 'Verwenden' : 'Use'}
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
