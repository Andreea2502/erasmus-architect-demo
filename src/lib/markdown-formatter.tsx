/**
 * MARKDOWN FORMATTER
 * ==================
 * Converts markdown-style text to formatted React elements for display.
 * Handles: **bold**, *italic*, `code`, bullet points (-, •, *),
 * numbered lists, headers (#, ##, ###), line breaks, and mixed HTML content.
 */

import React from 'react';

/**
 * Strip HTML tags and convert to plain markdown-style text
 * so formatMarkdownToReact can handle everything uniformly.
 */
function stripHtmlToText(html: string): string {
    let text = html;
    // Convert <br> / <br/> to newlines
    text = text.replace(/<br\s*\/?>/gi, '\n');
    // Convert <p>...</p> to double newlines
    text = text.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n');
    text = text.replace(/<p[^>]*>/gi, '');
    text = text.replace(/<\/p>/gi, '\n\n');
    // Convert <strong>/<b> to **
    text = text.replace(/<(strong|b)>/gi, '**');
    text = text.replace(/<\/(strong|b)>/gi, '**');
    // Convert <em>/<i> to *
    text = text.replace(/<(em|i)>/gi, '*');
    text = text.replace(/<\/(em|i)>/gi, '*');
    // Convert <li> to bullet points
    text = text.replace(/<li[^>]*>/gi, '- ');
    text = text.replace(/<\/li>/gi, '\n');
    // Convert heading tags
    text = text.replace(/<h1[^>]*>/gi, '# ');
    text = text.replace(/<\/h1>/gi, '\n\n');
    text = text.replace(/<h2[^>]*>/gi, '## ');
    text = text.replace(/<\/h2>/gi, '\n\n');
    text = text.replace(/<h3[^>]*>/gi, '### ');
    text = text.replace(/<\/h3>/gi, '\n\n');
    text = text.replace(/<h4[^>]*>/gi, '#### ');
    text = text.replace(/<\/h4>/gi, '\n\n');
    // Remove remaining HTML tags
    text = text.replace(/<[^>]+>/g, '');
    // Decode common HTML entities
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    // Clean up excessive whitespace
    text = text.replace(/\n{3,}/g, '\n\n');
    return text.trim();
}

/**
 * Clean up incomplete/broken markdown that might show as raw asterisks
 */
export function cleanBrokenMarkdown(text: string): string {
    if (!text) return '';

    let cleaned = text;

    // Step 1: Remove orphan ** that don't have a matching pair
    const doubleAsteriskMatches = cleaned.match(/\*\*/g);
    if (doubleAsteriskMatches && doubleAsteriskMatches.length % 2 !== 0) {
        const lastIdx = cleaned.lastIndexOf('**');
        if (lastIdx !== -1) {
            cleaned = cleaned.substring(0, lastIdx) + cleaned.substring(lastIdx + 2);
        }
    }

    // Step 2: Fix **bold** that spans too much text (> 200 chars = probably broken)
    cleaned = cleaned.replace(/\*\*([^*]{200,}?)\*\*/g, '$1');

    // Step 3: Remove ** at start of text without closing
    if (cleaned.startsWith('**') && !cleaned.substring(2, 100).includes('**')) {
        cleaned = cleaned.substring(2);
    }

    return cleaned.trim();
}

/**
 * Converts markdown text to React elements with proper formatting.
 * This handles ALL content: pure markdown, HTML, and mixed.
 * Supports: Headers (# ## ###), bullet lists (- • *), numbered lists (1. 2.),
 * bold (**text**), italic (*text*), code (`text`), and line breaks.
 */
export function formatMarkdownToReact(text: string): React.ReactNode {
    if (!text) return null;

    // If content contains HTML tags, normalize it to markdown first
    let processedText = text;
    if (/<[a-z][\s\S]*>/i.test(processedText)) {
        processedText = stripHtmlToText(processedText);
    }

    // Clean broken markdown
    processedText = cleanBrokenMarkdown(processedText);

    // Normalize header inline patterns
    processedText = processedText
        .replace(/\.\s*(#{1,3})\s+/g, '.\n\n$1 ')
        .replace(/([^.\n])\s*(#{1,3})\s+/g, '$1\n\n$2 ');

    // Split into blocks by double newlines
    const blocks = processedText.split(/\n\n+/);

    return (
        <div className="space-y-3">
            {blocks.map((block, bIdx) => {
                const trimmed = block.trim();
                if (!trimmed) return null;

                // --- Headers ---
                if (trimmed.startsWith('#### ')) {
                    return (
                        <h5 key={bIdx} className="text-sm font-bold text-gray-800 mt-3 mb-1">
                            {formatInlineMarkdown(trimmed.replace(/^####\s*/, ''))}
                        </h5>
                    );
                }
                if (trimmed.startsWith('### ')) {
                    return (
                        <h4 key={bIdx} className="text-base font-bold text-gray-800 mt-4 mb-1.5 border-b border-gray-200 pb-1">
                            {formatInlineMarkdown(trimmed.replace(/^###\s*/, ''))}
                        </h4>
                    );
                }
                if (trimmed.startsWith('## ')) {
                    return (
                        <h3 key={bIdx} className="text-lg font-bold text-blue-900 mt-5 mb-2 border-b-2 border-blue-200 pb-1">
                            {formatInlineMarkdown(trimmed.replace(/^##\s*/, ''))}
                        </h3>
                    );
                }
                if (trimmed.startsWith('# ')) {
                    return (
                        <h2 key={bIdx} className="text-xl font-bold text-blue-900 mt-6 mb-3">
                            {formatInlineMarkdown(trimmed.replace(/^#\s*/, ''))}
                        </h2>
                    );
                }

                // --- Split block into lines for list detection ---
                const lines = trimmed.split('\n');

                // Detect mixed content: some lines are bullets, some are not
                // Group consecutive bullet lines vs paragraph lines
                const groups: { type: 'bullets' | 'numbered' | 'paragraph'; lines: string[] }[] = [];
                let currentGroup: { type: 'bullets' | 'numbered' | 'paragraph'; lines: string[] } | null = null;

                for (const line of lines) {
                    const trimLine = line.trim();
                    if (!trimLine) continue;

                    const isBullet = /^[-•*]\s+/.test(trimLine);
                    const isNumbered = /^\d+[.)]\s+/.test(trimLine);
                    const type = isBullet ? 'bullets' : isNumbered ? 'numbered' : 'paragraph';

                    if (!currentGroup || currentGroup.type !== type) {
                        currentGroup = { type, lines: [] };
                        groups.push(currentGroup);
                    }
                    currentGroup.lines.push(trimLine);
                }

                // If there's only one group, render it directly
                if (groups.length === 1) {
                    const g = groups[0];
                    if (g.type === 'bullets') {
                        return (
                            <ul key={bIdx} className="list-disc list-outside space-y-1.5 ml-5 text-sm text-gray-700">
                                {g.lines.map((l, i) => (
                                    <li key={i} className="pl-1 leading-relaxed">
                                        {formatInlineMarkdown(l.replace(/^[-•*]\s*/, ''))}
                                    </li>
                                ))}
                            </ul>
                        );
                    }
                    if (g.type === 'numbered') {
                        return (
                            <ol key={bIdx} className="list-decimal list-outside space-y-1.5 ml-5 text-sm text-gray-700">
                                {g.lines.map((l, i) => (
                                    <li key={i} className="pl-1 leading-relaxed">
                                        {formatInlineMarkdown(l.replace(/^\d+[.)]\s*/, ''))}
                                    </li>
                                ))}
                            </ol>
                        );
                    }
                }

                // Multiple groups or paragraph: render each group
                if (groups.length > 1) {
                    return (
                        <div key={bIdx} className="space-y-2">
                            {groups.map((g, gIdx) => {
                                if (g.type === 'bullets') {
                                    return (
                                        <ul key={gIdx} className="list-disc list-outside space-y-1.5 ml-5 text-sm text-gray-700">
                                            {g.lines.map((l, i) => (
                                                <li key={i} className="pl-1 leading-relaxed">
                                                    {formatInlineMarkdown(l.replace(/^[-•*]\s*/, ''))}
                                                </li>
                                            ))}
                                        </ul>
                                    );
                                }
                                if (g.type === 'numbered') {
                                    return (
                                        <ol key={gIdx} className="list-decimal list-outside space-y-1.5 ml-5 text-sm text-gray-700">
                                            {g.lines.map((l, i) => (
                                                <li key={i} className="pl-1 leading-relaxed">
                                                    {formatInlineMarkdown(l.replace(/^\d+[.)]\s*/, ''))}
                                                </li>
                                            ))}
                                        </ol>
                                    );
                                }
                                return (
                                    <p key={gIdx} className="text-sm text-gray-700 leading-relaxed">
                                        {g.lines.map((l, i) => (
                                            <React.Fragment key={i}>
                                                {formatInlineMarkdown(l)}
                                                {i < g.lines.length - 1 && <br />}
                                            </React.Fragment>
                                        ))}
                                    </p>
                                );
                            })}
                        </div>
                    );
                }

                // Regular paragraph
                return (
                    <p key={bIdx} className="text-sm text-gray-700 leading-relaxed">
                        {lines.map((line, lIdx) => (
                            <React.Fragment key={lIdx}>
                                {formatInlineMarkdown(line)}
                                {lIdx < lines.length - 1 && <br />}
                            </React.Fragment>
                        ))}
                    </p>
                );
            })}
        </div>
    );
}

/**
 * Formats inline markdown: **bold**, *italic*, `code`
 */
function formatInlineMarkdown(text: string): React.ReactNode {
    if (!text) return null;

    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
        const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
        const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)/);
        const codeMatch = remaining.match(/`([^`]+)`/);

        const matches: { type: string; match: RegExpMatchArray; idx: number }[] = [];
        if (boldMatch && boldMatch.index !== undefined) {
            matches.push({ type: 'bold', match: boldMatch, idx: boldMatch.index });
        }
        if (italicMatch && italicMatch.index !== undefined) {
            matches.push({ type: 'italic', match: italicMatch, idx: italicMatch.index });
        }
        if (codeMatch && codeMatch.index !== undefined) {
            matches.push({ type: 'code', match: codeMatch, idx: codeMatch.index });
        }

        if (matches.length === 0) {
            parts.push(remaining);
            break;
        }

        matches.sort((a, b) => a.idx - b.idx);
        const earliest = matches[0];

        const beforeText = remaining.substring(0, earliest.idx);
        if (beforeText) {
            parts.push(beforeText);
        }

        switch (earliest.type) {
            case 'bold':
                parts.push(<strong key={key++} className="font-semibold text-gray-900">{earliest.match[1]}</strong>);
                break;
            case 'italic':
                parts.push(<em key={key++} className="italic">{earliest.match[1]}</em>);
                break;
            case 'code':
                parts.push(<code key={key++} className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{earliest.match[1]}</code>);
                break;
        }

        remaining = remaining.substring(earliest.idx + earliest.match[0].length);
    }

    return parts.length === 1 ? parts[0] : <>{parts}</>;
}

/**
 * Simple text version - strips markdown and returns plain text
 */
export function stripMarkdown(text: string): string {
    if (!text) return '';
    let cleaned = text;
    // Strip HTML first if present
    if (/<[a-z][\s\S]*>/i.test(cleaned)) {
        cleaned = stripHtmlToText(cleaned);
    }
    return cleaned
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/^[-•*]\s*/gm, '• ')
        .replace(/^\d+[.)]\s*/gm, '');
}
