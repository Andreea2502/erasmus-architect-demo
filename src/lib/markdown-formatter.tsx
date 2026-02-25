/**
 * MARKDOWN FORMATTER
 * ==================
 * Converts markdown-style text to formatted HTML for display
 * Handles: **bold**, *italic*, bullet points, numbered lists, line breaks
 */

import React from 'react';

/**
 * Clean up incomplete/broken markdown that might show as raw asterisks
 * Use this before displaying to ensure no raw markdown syntax shows
 */
export function cleanBrokenMarkdown(text: string): string {
    if (!text) return '';

    let cleaned = text;

    // STEP 1: Remove orphan ** that don't have a matching pair
    // Count ** occurrences - if odd number, there's an unclosed one
    const doubleAsteriskMatches = cleaned.match(/\*\*/g);
    if (doubleAsteriskMatches && doubleAsteriskMatches.length % 2 !== 0) {
        // Remove the last ** if odd count
        const lastIdx = cleaned.lastIndexOf('**');
        if (lastIdx !== -1) {
            cleaned = cleaned.substring(0, lastIdx) + cleaned.substring(lastIdx + 2);
        }
    }

    // STEP 2: Fix **bold** that spans too much text (likely broken)
    // If ** ... ** spans more than 200 characters, it's probably broken
    cleaned = cleaned.replace(/\*\*([^*]{200,}?)\*\*/g, '$1');

    // STEP 3: Remove ** at start of text without closing (common AI error)
    if (cleaned.startsWith('**') && !cleaned.substring(2, 100).includes('**')) {
        cleaned = cleaned.substring(2);
    }

    // STEP 4: Handle orphan single * that aren't part of ** or bullet points
    // Match single * that isn't preceded or followed by another *
    // But keep * at line start (bullet points)
    cleaned = cleaned.replace(/(?<![\*\n^])(\*)(?!\*)/g, (match, p1, offset) => {
        // Check if this is at start of line (bullet point)
        const beforeChar = offset > 0 ? cleaned[offset - 1] : '\n';
        if (beforeChar === '\n' || offset === 0) {
            return match; // Keep bullet point asterisks
        }
        // Check for valid *italic* pair
        const afterText = cleaned.substring(offset + 1);
        const nextAsterisk = afterText.indexOf('*');
        const nextDoubleAsterisk = afterText.indexOf('**');
        // If there's a closing * before ** (or no **), it's valid italic
        if (nextAsterisk !== -1 && (nextDoubleAsterisk === -1 || nextAsterisk < nextDoubleAsterisk)) {
            return match; // Keep valid italic marker
        }
        return ''; // Remove orphan *
    });

    // STEP 5: Clean up any multiple spaces created
    cleaned = cleaned.replace(/\s{2,}/g, ' ');

    return cleaned.trim();
}

/**
 * Converts markdown text to React elements with proper formatting
 * Supports: Headers (##), bullet lists, numbered lists, bold, italic
 */
export function formatMarkdownToReact(text: string): React.ReactNode {
    if (!text) return null;

    // Clean any broken/incomplete markdown first to avoid showing raw asterisks
    let cleanedText = cleanBrokenMarkdown(text);

    // STEP 1: Normalize inline headers - add newlines before ### and ## patterns
    // This handles cases where AI generates "text. ### Header text" without line breaks
    cleanedText = cleanedText
        .replace(/\.\s*(#{1,3})\s+/g, '.\n\n$1 ')  // "text. ### Header" -> "text.\n\n### Header"
        .replace(/([^.\n])\s*(#{1,3})\s+/g, '$1\n\n$2 '); // "text ### Header" -> "text\n\n### Header"

    // STEP 2: Convert ## and ### headers to just bold text (no header styling)
    // This creates clean paragraphs instead of jarring headers
    cleanedText = cleanedText
        .replace(/^###\s+(.+)$/gm, '\n**$1**\n')  // ### Header -> **Header**
        .replace(/^##\s+(.+)$/gm, '\n**$1**\n')   // ## Header -> **Header**
        .replace(/^#\s+(.+)$/gm, '\n**$1**\n');   // # Header -> **Header**

    // Split by double newlines for paragraphs
    const paragraphs = cleanedText.split(/\n\n+/);

    return (
        <div className="prose prose-lg max-w-none text-base leading-relaxed">
            {paragraphs.map((paragraph, pIdx) => {
                const trimmedParagraph = paragraph.trim();

                // Check for headers (## Header or ### Header)
                if (trimmedParagraph.startsWith('### ')) {
                    return (
                        <h4 key={pIdx} className="text-lg font-semibold text-gray-800 mt-4 mb-2 border-b border-gray-200 pb-1">
                            {formatInlineMarkdown(trimmedParagraph.replace(/^###\s*/, ''))}
                        </h4>
                    );
                }
                if (trimmedParagraph.startsWith('## ')) {
                    return (
                        <h3 key={pIdx} className="text-xl font-bold text-blue-900 mt-5 mb-3 border-b-2 border-blue-200 pb-1">
                            {formatInlineMarkdown(trimmedParagraph.replace(/^##\s*/, ''))}
                        </h3>
                    );
                }
                if (trimmedParagraph.startsWith('# ')) {
                    return (
                        <h2 key={pIdx} className="text-2xl font-bold text-blue-900 mt-6 mb-4">
                            {formatInlineMarkdown(trimmedParagraph.replace(/^#\s*/, ''))}
                        </h2>
                    );
                }

                // Check if this is a bullet list
                const lines = paragraph.split('\n');
                const isBulletList = lines.every(line =>
                    line.trim().startsWith('- ') ||
                    line.trim().startsWith('• ') ||
                    line.trim().startsWith('* ') ||
                    line.trim() === ''
                );

                // Check if this is a numbered list
                const isNumberedList = lines.every(line =>
                    /^\d+[\.\)]\s/.test(line.trim()) ||
                    line.trim() === ''
                );

                if (isBulletList && lines.some(l => l.trim())) {
                    return (
                        <ul key={pIdx} className="list-disc list-outside space-y-2 my-3 ml-6 text-base text-gray-700">
                            {lines
                                .filter(line => line.trim())
                                .map((line, lIdx) => (
                                    <li key={lIdx} className="pl-1">
                                        {formatInlineMarkdown(line.replace(/^[\-\•\*]\s*/, ''))}
                                    </li>
                                ))}
                        </ul>
                    );
                }

                if (isNumberedList && lines.some(l => l.trim())) {
                    return (
                        <ol key={pIdx} className="list-decimal list-outside space-y-2 my-3 ml-6 text-base text-gray-700">
                            {lines
                                .filter(line => line.trim())
                                .map((line, lIdx) => (
                                    <li key={lIdx} className="pl-1">
                                        {formatInlineMarkdown(line.replace(/^\d+[\.\)]\s*/, ''))}
                                    </li>
                                ))}
                        </ol>
                    );
                }

                // Regular paragraph with line breaks - larger text
                return (
                    <p key={pIdx} className="mb-3 text-base text-gray-700 leading-relaxed">
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

        // Find earliest match by index
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

        // Sort by index to find earliest
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
                parts.push(<code key={key++} className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{earliest.match[1]}</code>);
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
    return text
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
        .replace(/\*([^*]+)\*/g, '$1')     // Remove italic
        .replace(/`([^`]+)`/g, '$1')       // Remove code
        .replace(/^[\-\•\*]\s*/gm, '• ')   // Normalize bullets
        .replace(/^\d+[\.\)]\s*/gm, '');   // Remove numbered list prefixes
}
