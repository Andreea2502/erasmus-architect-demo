import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { url } = await request.json();

        if (!url) {
            return NextResponse.json({ error: 'URL ist erforderlich' }, { status: 400 });
        }

        let targetUrl = url;
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            targetUrl = 'https://' + targetUrl;
        }

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

            const response = await fetch(targetUrl, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; ErasmusArchitect/1.0; +https://erasmus-architect.eu)',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                },
            });

            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const html = await response.text();
            // Use a simple text extraction for now, similar to extract-partner
            const text = extractTextFromHTML(html);

            return NextResponse.json({ text });

        } catch (error) {
            console.error(`Error fetching ${url}:`, error);
            return NextResponse.json({ error: 'Fehler beim Abrufen der URL' }, { status: 500 });
        }

    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

function extractTextFromHTML(html: string): string {
    // Remove scripts and styles
    let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');

    // Remove comments
    text = text.replace(/<!--[\s\S]*?-->/g, ' ');

    // Replace block elements with newlines
    text = text.replace(/<\/(div|p|h[1-6]|li|tr|section|article)>/gi, '\n');
    text = text.replace(/<br\s*\/?>/gi, '\n');

    // Remove tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode entities (basic list)
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');

    // Clean whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
}
