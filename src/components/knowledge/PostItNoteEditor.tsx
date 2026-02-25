'use client';

/**
 * Post-It Note Editor Component
 * =============================
 * Rich Post-It style note editor with:
 * - Color selection
 * - Priority levels
 * - Deadlines
 * - Formatting options
 * - Checklist items
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Bold,
  Italic,
  Underline,
  Calendar,
  AlertCircle,
  AlertTriangle,
  Clock,
  CheckSquare,
  Square,
  Plus,
  X,
  Trash2,
  Save,
  Type,
  Flag,
  ListTodo,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Edit3,
  Check,
  RotateCcw,
  Mail,
  Bell,
} from 'lucide-react';
import type { KnowledgeNote } from '@/store/types';

// Color palette for Post-Its
const POST_IT_COLORS = {
  yellow: { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-900', hover: 'hover:bg-yellow-200', accent: 'bg-yellow-400' },
  pink: { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-900', hover: 'hover:bg-pink-200', accent: 'bg-pink-400' },
  blue: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-900', hover: 'hover:bg-blue-200', accent: 'bg-blue-400' },
  green: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-900', hover: 'hover:bg-green-200', accent: 'bg-green-400' },
  purple: { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-900', hover: 'hover:bg-purple-200', accent: 'bg-purple-400' },
  orange: { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-900', hover: 'hover:bg-orange-200', accent: 'bg-orange-400' },
};

const PRIORITY_CONFIG = {
  low: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100', label: { de: 'Niedrig', en: 'Low' } },
  medium: { icon: Flag, color: 'text-blue-500', bg: 'bg-blue-100', label: { de: 'Mittel', en: 'Medium' } },
  high: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-100', label: { de: 'Hoch', en: 'High' } },
  urgent: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100', label: { de: 'Dringend', en: 'Urgent' } },
};

const STATUS_CONFIG = {
  todo: { color: 'bg-slate-200 text-slate-700', label: { de: 'Zu erledigen', en: 'To Do' } },
  in_progress: { color: 'bg-blue-200 text-blue-700', label: { de: 'In Bearbeitung', en: 'In Progress' } },
  done: { color: 'bg-green-200 text-green-700', label: { de: 'Erledigt', en: 'Done' } },
  archived: { color: 'bg-gray-200 text-gray-500', label: { de: 'Archiviert', en: 'Archived' } },
};

interface PostItNoteEditorProps {
  note?: KnowledgeNote;
  onSave: (note: Omit<KnowledgeNote, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  language?: string;
}

export function PostItNoteEditor({
  note,
  onSave,
  onCancel,
  language = 'de'
}: PostItNoteEditorProps) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [color, setColor] = useState<KnowledgeNote['color']>(note?.color || 'yellow');
  const [priority, setPriority] = useState<KnowledgeNote['priority']>(note?.priority || 'medium');
  const [status, setStatus] = useState<KnowledgeNote['status']>(note?.status || 'todo');
  const [category, setCategory] = useState<KnowledgeNote['category']>(note?.category || 'insight');
  const [deadline, setDeadline] = useState<string>(
    note?.deadline ? new Date(note.deadline).toISOString().split('T')[0] : ''
  );
  const [formatting, setFormatting] = useState(note?.formatting || { fontSize: 'medium' as const });
  const [checklist, setChecklist] = useState<{ id: string; text: string; checked: boolean }[]>(
    note?.checklist || []
  );
  const [newChecklistItem, setNewChecklistItem] = useState('');

  const colorStyles = POST_IT_COLORS[color];

  const handleSave = () => {
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      content: content.trim(),
      color,
      priority,
      status,
      category,
      deadline: deadline ? new Date(deadline) : undefined,
      formatting,
      checklist: checklist.length > 0 ? checklist : undefined,
      tags: [],
    });
  };

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setChecklist(prev => [
      ...prev,
      { id: `check-${Date.now()}`, text: newChecklistItem.trim(), checked: false }
    ]);
    setNewChecklistItem('');
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist(prev =>
      prev.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const removeChecklistItem = (id: string) => {
    setChecklist(prev => prev.filter(item => item.id !== id));
  };

  const toggleFormatting = (key: 'bold' | 'italic' | 'underline') => {
    setFormatting(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const setFontSize = (size: 'small' | 'medium' | 'large') => {
    setFormatting(prev => ({ ...prev, fontSize: size }));
  };

  const getContentStyle = () => {
    const styles: React.CSSProperties = {};
    if (formatting.bold) styles.fontWeight = 'bold';
    if (formatting.italic) styles.fontStyle = 'italic';
    if (formatting.underline) styles.textDecoration = 'underline';
    if (formatting.fontSize === 'small') styles.fontSize = '12px';
    if (formatting.fontSize === 'large') styles.fontSize = '16px';
    return styles;
  };

  const isDeadlinePast = deadline && new Date(deadline) < new Date();
  const isDeadlineSoon = deadline && !isDeadlinePast &&
    new Date(deadline) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  return (
    <div
      className={`rounded-xl border-2 shadow-lg overflow-hidden transition-all duration-200 ${colorStyles.bg} ${colorStyles.border}`}
      style={{
        transform: 'rotate(-0.5deg)',
        boxShadow: '4px 4px 15px rgba(0,0,0,0.15)'
      }}
    >
      {/* Color Strip */}
      <div className={`h-2 ${colorStyles.accent}`} />

      {/* Main Content */}
      <div className="p-4 space-y-3">
        {/* Color Picker */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs font-medium ${colorStyles.text}`}>
            {language === 'de' ? 'Farbe:' : 'Color:'}
          </span>
          <div className="flex gap-1">
            {(Object.keys(POST_IT_COLORS) as KnowledgeNote['color'][]).map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  POST_IT_COLORS[c].accent
                } ${color === c ? 'scale-125 border-gray-600' : 'border-transparent hover:scale-110'}`}
              />
            ))}
          </div>
        </div>

        {/* Title */}
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={language === 'de' ? 'Titel der Notiz...' : 'Note title...'}
          className={`font-bold text-lg border-none shadow-none bg-transparent ${colorStyles.text} placeholder:opacity-50`}
        />

        {/* Priority & Status Row */}
        <div className="flex flex-wrap gap-2">
          {/* Priority */}
          <div className="flex items-center gap-1">
            <span className={`text-[10px] uppercase font-bold ${colorStyles.text} opacity-70`}>
              {language === 'de' ? 'Priorität' : 'Priority'}
            </span>
            <div className="flex gap-0.5">
              {(Object.keys(PRIORITY_CONFIG) as KnowledgeNote['priority'][]).map(p => {
                const config = PRIORITY_CONFIG[p];
                const Icon = config.icon;
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`p-1.5 rounded transition-all ${
                      priority === p
                        ? `${config.bg} ${config.color} ring-2 ring-offset-1`
                        : `hover:${config.bg} text-gray-400`
                    }`}
                    title={config.label[language as 'de' | 'en']}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-1">
            <span className={`text-[10px] uppercase font-bold ${colorStyles.text} opacity-70`}>
              Status
            </span>
            <div className="flex gap-0.5">
              {(Object.keys(STATUS_CONFIG) as KnowledgeNote['status'][]).map(s => {
                const config = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                      status === s
                        ? `${config.color} ring-2 ring-offset-1`
                        : 'bg-white/50 text-gray-500 hover:bg-white'
                    }`}
                  >
                    {config.label[language as 'de' | 'en']}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Deadline */}
        <div className="flex items-center gap-2">
          <Calendar className={`h-4 w-4 ${
            isDeadlinePast ? 'text-red-500' :
            isDeadlineSoon ? 'text-orange-500' :
            colorStyles.text
          }`} />
          <Input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={`flex-1 h-8 text-sm border-none bg-white/50 ${
              isDeadlinePast ? 'text-red-600' :
              isDeadlineSoon ? 'text-orange-600' : ''
            }`}
          />
          {deadline && (
            <button
              onClick={() => setDeadline('')}
              className="p-1 hover:bg-red-100 rounded text-red-500"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          {isDeadlinePast && (
            <Badge variant="destructive" className="text-[10px]">
              {language === 'de' ? 'Überfällig!' : 'Overdue!'}
            </Badge>
          )}
          {isDeadlineSoon && !isDeadlinePast && (
            <Badge className="text-[10px] bg-orange-500">
              {language === 'de' ? 'Bald fällig' : 'Due soon'}
            </Badge>
          )}
        </div>

        {/* Formatting Toolbar */}
        <div className="flex items-center gap-1 p-1 bg-white/50 rounded-lg">
          <button
            onClick={() => toggleFormatting('bold')}
            className={`p-1.5 rounded ${formatting.bold ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
            title={language === 'de' ? 'Fett' : 'Bold'}
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => toggleFormatting('italic')}
            className={`p-1.5 rounded ${formatting.italic ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
            title={language === 'de' ? 'Kursiv' : 'Italic'}
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => toggleFormatting('underline')}
            className={`p-1.5 rounded ${formatting.underline ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
            title={language === 'de' ? 'Unterstrichen' : 'Underline'}
          >
            <Underline className="h-3.5 w-3.5" />
          </button>

          <div className="w-px h-4 bg-gray-300 mx-1" />

          <button
            onClick={() => setFontSize('small')}
            className={`px-2 py-1 rounded text-[10px] font-medium ${formatting.fontSize === 'small' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          >
            A
          </button>
          <button
            onClick={() => setFontSize('medium')}
            className={`px-2 py-1 rounded text-xs font-medium ${formatting.fontSize === 'medium' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          >
            A
          </button>
          <button
            onClick={() => setFontSize('large')}
            className={`px-2 py-1 rounded text-sm font-medium ${formatting.fontSize === 'large' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          >
            A
          </button>
        </div>

        {/* Content */}
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={language === 'de' ? 'Notiz schreiben...' : 'Write your note...'}
          rows={4}
          className={`border-none bg-white/50 resize-none ${colorStyles.text}`}
          style={getContentStyle()}
        />

        {/* Checklist Section - Always visible and prominent */}
        <div className="space-y-3 p-3 bg-white/70 rounded-xl border-2 border-dashed border-gray-300">
          <div className="flex items-center justify-between">
            <h4 className={`flex items-center gap-2 text-sm font-bold ${colorStyles.text}`}>
              <ListTodo className="h-5 w-5" />
              {language === 'de' ? 'Checkliste / To-Do' : 'Checklist / To-Do'}
            </h4>
            {checklist.length > 0 && (
              <Badge variant="secondary" className="text-xs px-2 py-1">
                {checklist.filter(c => c.checked).length}/{checklist.length} {language === 'de' ? 'erledigt' : 'done'}
              </Badge>
            )}
          </div>

          {/* Add new item - Prominent */}
          <div className="flex gap-2">
            <Input
              value={newChecklistItem}
              onChange={(e) => setNewChecklistItem(e.target.value)}
              placeholder={language === 'de' ? '+ Neuen Punkt hinzufügen...' : '+ Add new item...'}
              className="flex-1 h-10 text-sm bg-white border-2 border-gray-200 focus:border-amber-400"
              onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
            />
            <Button
              onClick={addChecklistItem}
              disabled={!newChecklistItem.trim()}
              className="h-10 px-4 bg-green-500 hover:bg-green-600 text-white"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          {/* Checklist items - Larger and more prominent */}
          {checklist.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {checklist.map(item => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-2 rounded-lg group transition-colors ${
                    item.checked ? 'bg-green-50' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <button
                    onClick={() => toggleChecklistItem(item.id)}
                    className={`shrink-0 p-1 rounded transition-colors ${
                      item.checked
                        ? 'text-green-600 bg-green-100'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {item.checked ? (
                      <CheckSquare className="h-6 w-6" />
                    ) : (
                      <Square className="h-6 w-6" />
                    )}
                  </button>
                  <span className={`flex-1 text-sm ${
                    item.checked ? 'line-through text-gray-400' : 'text-gray-700'
                  }`}>
                    {item.text}
                  </span>
                  <button
                    onClick={() => removeChecklistItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 rounded-full text-red-500 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {checklist.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-2">
              {language === 'de' ? 'Noch keine Punkte - füge welche hinzu!' : 'No items yet - add some!'}
            </p>
          )}
        </div>

        {/* Category Selection */}
        <div className="flex items-center gap-2">
          <span className={`text-[10px] uppercase font-bold ${colorStyles.text} opacity-70`}>
            {language === 'de' ? 'Kategorie' : 'Category'}
          </span>
          <div className="flex flex-wrap gap-1">
            {(['insight', 'reminder', 'draft', 'reference'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                  category === cat
                    ? 'bg-white text-gray-800 ring-2 ring-offset-1'
                    : 'bg-white/50 text-gray-600 hover:bg-white'
                }`}
              >
                {cat === 'insight' && (language === 'de' ? 'Erkenntnis' : 'Insight')}
                {cat === 'reminder' && (language === 'de' ? 'Erinnerung' : 'Reminder')}
                {cat === 'draft' && (language === 'de' ? 'Entwurf' : 'Draft')}
                {cat === 'reference' && (language === 'de' ? 'Referenz' : 'Reference')}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-2 border-t border-current/10">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className={`${colorStyles.text} opacity-70 hover:opacity-100`}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            {language === 'de' ? 'Abbrechen' : 'Cancel'}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!title.trim()}
            className={`${colorStyles.accent} text-white hover:opacity-90`}
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            {language === 'de' ? 'Speichern' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Post-It Note Display Component
interface PostItNoteProps {
  note: KnowledgeNote;
  onEdit: (note: KnowledgeNote) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: KnowledgeNote['status']) => void;
  onToggleChecklistItem: (noteId: string, checklistId: string) => void;
  language?: string;
}

export function PostItNote({
  note,
  onEdit,
  onDelete,
  onUpdateStatus,
  onToggleChecklistItem,
  language = 'de'
}: PostItNoteProps) {
  const colorStyles = POST_IT_COLORS[note.color || 'yellow'];
  const priorityConfig = PRIORITY_CONFIG[note.priority || 'medium'];
  const statusConfig = STATUS_CONFIG[note.status || 'todo'];
  const PriorityIcon = priorityConfig.icon;

  const isDeadlinePast = note.deadline && new Date(note.deadline) < new Date();
  const isDeadlineSoon = note.deadline && !isDeadlinePast &&
    new Date(note.deadline) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  const getContentStyle = () => {
    const styles: React.CSSProperties = {};
    if (note.formatting?.bold) styles.fontWeight = 'bold';
    if (note.formatting?.italic) styles.fontStyle = 'italic';
    if (note.formatting?.underline) styles.textDecoration = 'underline';
    if (note.formatting?.fontSize === 'small') styles.fontSize = '11px';
    if (note.formatting?.fontSize === 'large') styles.fontSize = '14px';
    return styles;
  };

  const completedChecklist = note.checklist?.filter(c => c.checked).length || 0;
  const totalChecklist = note.checklist?.length || 0;

  return (
    <div
      data-note-id={note.id}
      className={`rounded-lg border-2 shadow-md overflow-hidden transition-all duration-200 hover:shadow-lg group ${colorStyles.bg} ${colorStyles.border}`}
      style={{
        transform: `rotate(${Math.random() * 2 - 1}deg)`,
      }}
    >
      {/* Color Strip */}
      <div className={`h-1.5 ${colorStyles.accent}`} />

      <div className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <PriorityIcon className={`h-3.5 w-3.5 shrink-0 ${priorityConfig.color}`} />
              <span className={`font-bold text-sm truncate ${colorStyles.text}`}>
                {note.title}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${statusConfig.color}`}>
                {statusConfig.label[language as 'de' | 'en']}
              </span>
              {note.deadline && (
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium flex items-center gap-0.5 ${
                  isDeadlinePast ? 'bg-red-200 text-red-700' :
                  isDeadlineSoon ? 'bg-orange-200 text-orange-700' :
                  'bg-white/60'
                }`}>
                  <Calendar className="h-2.5 w-2.5" />
                  {new Date(note.deadline).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
                    day: '2-digit',
                    month: '2-digit'
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Email Reminder Button */}
            <button
              onClick={async () => {
                const email = prompt(language === 'de'
                  ? 'E-Mail-Adresse für Erinnerung eingeben:'
                  : 'Enter email address for reminder:');
                if (email) {
                  try {
                    const response = await fetch('/api/send-reminder', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        to: email,
                        subject: `📋 Erinnerung: ${note.title}`,
                        noteTitle: note.title,
                        noteContent: note.content,
                        deadline: note.deadline,
                        projectName: 'Erasmus+ Projekt',
                      }),
                    });
                    const result = await response.json();
                    if (result.success) {
                      alert(language === 'de'
                        ? `✅ Erinnerung an ${email} gesendet!`
                        : `✅ Reminder sent to ${email}!`);
                    } else {
                      alert(language === 'de'
                        ? `❌ Fehler: ${result.error}`
                        : `❌ Error: ${result.error}`);
                    }
                  } catch (error) {
                    alert(language === 'de'
                      ? '❌ E-Mail konnte nicht gesendet werden'
                      : '❌ Failed to send email');
                  }
                }
              }}
              className={`p-1 rounded ${colorStyles.hover}`}
              title={language === 'de' ? 'Per E-Mail erinnern' : 'Send email reminder'}
            >
              <Mail className="h-3 w-3" />
            </button>
            <button
              onClick={() => onEdit(note)}
              className={`p-1 rounded ${colorStyles.hover}`}
              title={language === 'de' ? 'Bearbeiten' : 'Edit'}
            >
              <Edit3 className="h-3 w-3" />
            </button>
            <button
              onClick={() => onDelete(note.id)}
              className="p-1 rounded hover:bg-red-100 text-red-500"
              title={language === 'de' ? 'Löschen' : 'Delete'}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Content */}
        {note.content && (
          <p
            className={`text-xs ${colorStyles.text} line-clamp-3`}
            style={getContentStyle()}
          >
            {note.content}
          </p>
        )}

        {/* Checklist Preview */}
        {note.checklist && note.checklist.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] font-medium opacity-70">
              <ListTodo className="h-3 w-3" />
              {completedChecklist}/{totalChecklist}
            </div>
            <div className="space-y-0.5">
              {note.checklist.slice(0, 3).map(item => (
                <button
                  key={item.id}
                  onClick={() => onToggleChecklistItem(note.id, item.id)}
                  className={`flex items-center gap-1.5 text-[10px] w-full text-left ${
                    item.checked ? 'text-gray-400' : colorStyles.text
                  }`}
                >
                  {item.checked ? (
                    <CheckSquare className="h-3 w-3 text-green-600 shrink-0" />
                  ) : (
                    <Square className="h-3 w-3 shrink-0" />
                  )}
                  <span className={item.checked ? 'line-through' : ''}>
                    {item.text}
                  </span>
                </button>
              ))}
              {note.checklist.length > 3 && (
                <span className="text-[10px] text-gray-500 pl-4">
                  +{note.checklist.length - 3} {language === 'de' ? 'weitere' : 'more'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Quick Status Change */}
        {note.status !== 'done' && (
          <button
            onClick={() => onUpdateStatus(note.id, note.status === 'todo' ? 'in_progress' : 'done')}
            className={`w-full py-1 rounded text-[10px] font-medium transition-colors ${colorStyles.hover} ${colorStyles.text} opacity-70 hover:opacity-100`}
          >
            {note.status === 'todo'
              ? (language === 'de' ? '▶ Starten' : '▶ Start')
              : (language === 'de' ? '✓ Erledigt' : '✓ Done')
            }
          </button>
        )}
        {note.status === 'done' && (
          <button
            onClick={() => onUpdateStatus(note.id, 'todo')}
            className={`w-full py-1 rounded text-[10px] font-medium transition-colors ${colorStyles.hover} ${colorStyles.text} opacity-50 hover:opacity-70`}
          >
            <RotateCcw className="h-2.5 w-2.5 inline mr-1" />
            {language === 'de' ? 'Wiederherstellen' : 'Restore'}
          </button>
        )}
      </div>
    </div>
  );
}

export default PostItNoteEditor;
