"use client";

import React, { useRef, useEffect, useState } from 'react';
import {
    Bold,
    Italic,
    Underline,
    List,
    ListOrdered,
    Palette,
    Type,
    Highlighter,
} from 'lucide-react';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    minHeight?: string;
}

/**
 * Convert Markdown to HTML for display in editor
 * This ensures the editor shows formatted text, not raw markdown
 */
function markdownToHtml(text: string): string {
    if (!text) return '';

    // If already contains HTML tags, return as-is
    if (text.includes('<p>') || text.includes('<strong>') || text.includes('<ul>')) {
        return text;
    }

    let html = text;

    // Convert headers to bold paragraphs (no actual headers in editor)
    html = html.replace(/^### (.+)$/gm, '<p><strong>$1</strong></p>');
    html = html.replace(/^## (.+)$/gm, '<p><strong>$1</strong></p>');
    html = html.replace(/^# (.+)$/gm, '<p><strong>$1</strong></p>');

    // Convert **bold** to <strong>
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Convert *italic* to <em>
    html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

    // Convert bullet lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Convert double newlines to paragraph breaks
    const paragraphs = html.split(/\n\n+/);
    html = paragraphs.map(p => {
        const trimmed = p.trim();
        if (!trimmed) return '';
        // Don't wrap if already wrapped or is a list
        if (trimmed.startsWith('<p>') || trimmed.startsWith('<ul>') || trimmed.startsWith('<ol>')) {
            return trimmed;
        }
        return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    }).filter(Boolean).join('');

    return html;
}

const COLORS = [
    '#000000', '#333333', '#666666', '#999999',
    '#003399', '#0055cc', '#0077ff', '#00aaff',
    '#006600', '#009900', '#00cc00', '#00ff00',
    '#cc0000', '#ff0000', '#ff6600', '#ffcc00',
    '#660099', '#9900cc', '#cc00ff', '#ff00ff',
];

const FONT_SIZES = [
    { label: 'Klein', value: '1' },
    { label: 'Normal', value: '3' },
    { label: 'Mittel', value: '4' },
    { label: 'Groß', value: '5' },
    { label: 'Sehr groß', value: '6' },
];

export function RichTextEditor({
    value,
    onChange,
    placeholder = 'Text eingeben...',
    minHeight = '150px'
}: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showHighlightPicker, setShowHighlightPicker] = useState(false);
    const [showSizePicker, setShowSizePicker] = useState(false);

    // Initialize and update content - convert markdown to HTML for proper display
    useEffect(() => {
        if (editorRef.current) {
            const htmlContent = markdownToHtml(value || '');
            // Only update if content is different (to preserve cursor position)
            const currentContent = editorRef.current.innerHTML;
            if (currentContent !== htmlContent && currentContent !== value) {
                editorRef.current.innerHTML = htmlContent;
            }
        }
    }, [value]);

    // Handle content change
    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    // Execute formatting command
    const execCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        handleInput();
    };

    // Toolbar button
    const ToolbarButton = ({
        onClick,
        active,
        title,
        children
    }: {
        onClick: () => void;
        active?: boolean;
        title: string;
        children: React.ReactNode;
    }) => (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${active ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
                }`}
        >
            {children}
        </button>
    );

    return (
        <div className="border rounded-lg overflow-hidden bg-white">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b">
                {/* Bold */}
                <ToolbarButton onClick={() => execCommand('bold')} title="Fett (Ctrl+B)">
                    <Bold size={16} />
                </ToolbarButton>

                {/* Italic */}
                <ToolbarButton onClick={() => execCommand('italic')} title="Kursiv (Ctrl+I)">
                    <Italic size={16} />
                </ToolbarButton>

                {/* Underline */}
                <ToolbarButton onClick={() => execCommand('underline')} title="Unterstrichen (Ctrl+U)">
                    <Underline size={16} />
                </ToolbarButton>

                <div className="w-px h-5 bg-gray-300 mx-1" />

                {/* Bullet List */}
                <ToolbarButton onClick={() => execCommand('insertUnorderedList')} title="Aufzählung">
                    <List size={16} />
                </ToolbarButton>

                {/* Numbered List */}
                <ToolbarButton onClick={() => execCommand('insertOrderedList')} title="Nummerierte Liste">
                    <ListOrdered size={16} />
                </ToolbarButton>

                <div className="w-px h-5 bg-gray-300 mx-1" />

                {/* Font Size */}
                <div className="relative">
                    <ToolbarButton
                        onClick={() => { setShowSizePicker(!showSizePicker); setShowColorPicker(false); setShowHighlightPicker(false); }}
                        title="Schriftgröße"
                        active={showSizePicker}
                    >
                        <Type size={16} />
                    </ToolbarButton>
                    {showSizePicker && (
                        <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-50 py-1 min-w-[100px]">
                            {FONT_SIZES.map(size => (
                                <button
                                    key={size.value}
                                    onClick={() => { execCommand('fontSize', size.value); setShowSizePicker(false); }}
                                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                                >
                                    {size.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Text Color */}
                <div className="relative">
                    <ToolbarButton
                        onClick={() => { setShowColorPicker(!showColorPicker); setShowSizePicker(false); setShowHighlightPicker(false); }}
                        title="Textfarbe"
                        active={showColorPicker}
                    >
                        <Palette size={16} />
                    </ToolbarButton>
                    {showColorPicker && (
                        <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-50 p-2 grid grid-cols-4 gap-1">
                            {COLORS.map(color => (
                                <button
                                    key={color}
                                    onClick={() => { execCommand('foreColor', color); setShowColorPicker(false); }}
                                    className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Highlight */}
                <div className="relative">
                    <ToolbarButton
                        onClick={() => { setShowHighlightPicker(!showHighlightPicker); setShowColorPicker(false); setShowSizePicker(false); }}
                        title="Hervorheben"
                        active={showHighlightPicker}
                    >
                        <Highlighter size={16} />
                    </ToolbarButton>
                    {showHighlightPicker && (
                        <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-50 p-2 grid grid-cols-4 gap-1">
                            <button
                                onClick={() => { execCommand('hiliteColor', 'transparent'); setShowHighlightPicker(false); }}
                                className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform text-xs"
                                title="Keine"
                            >
                                ✕
                            </button>
                            {['#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ff6600', '#ffcc00', '#ccff00'].map(color => (
                                <button
                                    key={color}
                                    onClick={() => { execCommand('hiliteColor', color); setShowHighlightPicker(false); }}
                                    className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Editable Content */}
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                onBlur={handleInput}
                className="p-3 outline-none overflow-y-auto"
                style={{ minHeight }}
                data-placeholder={placeholder}
                suppressContentEditableWarning
            />

            <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          font-style: italic;
        }
      `}</style>
        </div>
    );
}

export default RichTextEditor;
