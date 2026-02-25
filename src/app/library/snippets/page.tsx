"use client";

import React, { useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { useLanguageStore } from '@/store/language-store';
import { BookmarkPlus, Trash2, Copy, CheckCircle2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AppShell } from '@/components/layout/AppShell';

export default function SnippetsLibraryPage() {
    const { language } = useLanguageStore();
    const { snippets, deleteSnippet, updateSnippet } = useAppStore();
    const [editingSnippetId, setEditingSnippetId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCopy = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <AppShell>
            <div className="max-w-6xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                        <BookmarkPlus className="h-8 w-8 text-blue-500" />
                        {language === 'de' ? 'Gespeicherte Text-Snippets' : 'Saved Text Snippets'}
                    </h1>
                    <p className="mt-2 text-gray-500">
                        {language === 'de'
                            ? 'Verwalte deine Text-Snippets, sortiert nach Themen, für die künftige Projektgenerierung.'
                            : 'Manage your text snippets, categorized by theme, to use in future text generations.'}
                    </p>
                </div>

                <div className="space-y-4">
                    {(!snippets || snippets.length === 0) ? (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                            <BookmarkPlus className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">Keine Snippets vorhanden</h3>
                            <p className="mt-1 text-gray-500 max-w-sm mx-auto">
                                Speichere gelungene Textabschnitte direkt in der Antragsgenerierung, um sie später wiederzuverwenden oder die KI damit zu trainieren.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {snippets.map((snippet) => (
                                <div key={snippet.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                                    {/* View Mode */}
                                    {editingSnippetId !== snippet.id ? (
                                        <>
                                            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-start gap-4">
                                                <div className="min-w-0">
                                                    <h4 className="font-semibold text-gray-900 truncate" title={snippet.title}>
                                                        {snippet.title}
                                                    </h4>
                                                    {snippet.tags && snippet.tags.length > 0 && (
                                                        <div className="flex gap-1 mt-1.5 flex-wrap">
                                                            {snippet.tags.map(tag => (
                                                                <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded-full uppercase tracking-wider font-semibold">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex shrink-0">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600" onClick={() => setEditingSnippetId(snippet.id)}>
                                                        <ExternalLink className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => {
                                                        if (window.confirm('Snippet wirklich löschen?')) deleteSnippet(snippet.id);
                                                    }}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="p-4 flex-1">
                                                <div className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-6 font-serif">
                                                    {snippet.content}
                                                </div>
                                            </div>
                                            <div className="p-3 bg-gray-50 border-t border-gray-100 mt-auto">
                                                <Button
                                                    variant="secondary"
                                                    className="w-full text-xs h-8"
                                                    onClick={() => handleCopy(snippet.id, snippet.content)}
                                                >
                                                    {copiedId === snippet.id ? (
                                                        <span className="flex items-center text-green-600"><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Kopiert</span>
                                                    ) : (
                                                        <span className="flex items-center text-gray-600"><Copy className="h-3.5 w-3.5 mr-1" /> Text kopieren</span>
                                                    )}
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        /* Edit Mode */
                                        <div className="p-4 flex flex-col h-full space-y-3">
                                            <Input
                                                defaultValue={snippet.title}
                                                onChange={(e) => updateSnippet(snippet.id, { title: e.target.value })}
                                                className="font-semibold bg-gray-50"
                                            />
                                            <Textarea
                                                defaultValue={snippet.content}
                                                onChange={(e) => updateSnippet(snippet.id, { content: e.target.value })}
                                                className="flex-1 min-h-[150px] font-serif text-sm resize-none"
                                            />
                                            <div className="flex gap-2 pt-2">
                                                <Button className="flex-1" size="sm" onClick={() => setEditingSnippetId(null)}>
                                                    Speichern
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
