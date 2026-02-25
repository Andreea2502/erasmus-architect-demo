/**
 * API Route: Partner aus Website extrahieren
 * ==========================================
 * Server-seitig Website abrufen (kein CORS) und mit Gemini analysieren
 */

import { NextRequest, NextResponse } from 'next/server';

const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent`;

function getApiKeys(): string[] {
  const keys: string[] = [];
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
  const fb = process.env.GEMINI_API_KEY_FALLBACK;
  if (fb && fb.trim() !== '') keys.push(fb);
  return keys;
}

export async function POST(request: NextRequest) {
  try {
    const { url, language = 'de' } = await request.json();

    // API Key aus Header oder Environment (mit Fallback-Support)
    const headerApiKey = request.headers.get('x-gemini-api-key');
    const availableKeys = headerApiKey ? [headerApiKey] : getApiKeys();
    const apiKey = availableKeys[0];

    console.log('[API/extract-partner] Request for URL:', url);
    console.log('[API/extract-partner] Has API Key:', !!apiKey);

    if (!url) {
      return NextResponse.json({ error: 'URL ist erforderlich' }, { status: 400 });
    }

    if (!apiKey) {
      console.error('[API/extract-partner] Missing API Key. Env Var GEMINI_API_KEY:', !!process.env.GEMINI_API_KEY);
      return NextResponse.json({ error: 'Gemini API Key nicht konfiguriert' }, { status: 500 });
    }

    // 1. Website-Inhalt abrufen (Server-seitig, kein CORS!)
    let websiteContent = '';
    let fetchError = '';

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15 Sekunden Timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ErasmusArchitect/1.0; +https://erasmus-architect.eu)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'de,en;q=0.9',
        },
      });

      clearTimeout(timeout);

      if (response.ok) {
        // Limit HTML size to 500KB to avoid crash/timeout on huge pages
        const html = await response.text();
        if (html.length > 500000) {
          websiteContent = extractTextFromHTML(html.substring(0, 500000));
          fetchError = 'Truncated (too large)';
        } else {
          websiteContent = extractTextFromHTML(html);
        }
      } else {
        fetchError = `HTTP ${response.status}`;
      }
    } catch (e) {
      const err = e as Error;
      if (err.name === 'AbortError') {
        fetchError = 'Timeout (5s limit)';
        console.warn(`Timeout fetching ${url}`);
      } else {
        fetchError = err.message;
        console.error(`Error fetching ${url}:`, err);
      }
    }

    // 2. Gemini mit Website-Inhalt aufrufen
    const langInstructions: Record<string, string> = {
      de: 'Antworte auf Deutsch.',
      en: 'Respond in English.',
      es: 'Responde en español.',
      fr: 'Réponds en français.',
      it: 'Rispondi in italiano.',
    };

    const systemContext = `Du bist ein Experte für Erasmus+ Projekte und analysierst Organisationen für EU-Förderanträge.
${langInstructions[language] || langInstructions.en}

${websiteContent ? `
WICHTIG: Ich habe dir den tatsächlichen Inhalt der Website bereitgestellt.
Analysiere NUR diese Informationen - erfinde NICHTS!
Wenn eine Information nicht im Text steht, verwende null oder leere Arrays.
` : `
HINWEIS: Die Website konnte nicht direkt abgerufen werden (${fetchError}).
Versuche basierend auf der URL und deinem Wissen über diese Organisation Informationen zu finden.
Markiere unsichere Informationen mit niedrigerer dataQuality (30-50).
`}

Sei besonders gründlich bei:
- Organisation Name, Typ, Land, Stadt
- Kontaktpersonen (Name, Rolle, Email, Telefon) - suche nach Team-Seiten, Impressum, Kontakt
- Expertise-Bereiche die für EU-Projekte relevant sind
- Bisherige EU-Projekte oder internationale Kooperationen
- Zielgruppen mit denen die Organisation arbeitet`;

    const prompt = `Analysiere diese Organisation: ${url}

${websiteContent ? `
WEBSITE-INHALT:
===============
${websiteContent.substring(0, 30000)}
===============
` : ''}

Gib mir ein JSON-Objekt mit folgender Struktur (NUR das JSON, keine Erklärungen):
{
  "organizationName": "Vollständiger Name",
  "acronym": "Kürzel falls vorhanden oder null",
  "country": "ISO 2-Letter Code (DE, AT, ES, etc.)",
  "city": "Stadt",
  "website": "${url}",
  "email": "Haupt-Email oder null",
  "phone": "Telefonnummer oder null",
  "organizationType": "HIGHER_EDUCATION|SCHOOL|VET_PROVIDER|ADULT_EDUCATION|NGO|PUBLIC_AUTHORITY|SME|LARGE_ENTERPRISE|RESEARCH_INSTITUTE|SOCIAL_ENTERPRISE|OTHER",
  "missionStatement": "Kurze Beschreibung der Mission/Ziele (max 200 Wörter) oder null",
  "foundingYear": null,
  "contacts": [
    {
      "firstName": "Vorname",
      "lastName": "Nachname",
      "role": "Position/Funktion",
      "email": "email@example.com oder null",
      "phone": "+49... oder null",
      "isPrimary": true
    }
  ],
  "expertiseAreas": [
    {
      "domain": "CURRICULUM_DEVELOPMENT|DIGITAL_TOOLS|TRAINING_DELIVERY|RESEARCH_EVALUATION|TARGET_GROUP_ACCESS|POLICY_ADVOCACY|COMMUNICATION_MEDIA|TECHNICAL_DEVELOPMENT|QUALITY_ASSURANCE|PROJECT_MANAGEMENT|OTHER",
      "description": "Beschreibung der Expertise",
      "level": 3
    }
  ],
  "targetGroups": [
    {
      "group": "YOUTH_15_18|YOUTH_18_25|NEET|UNEMPLOYED_ADULTS|LOW_SKILLED_ADULTS|MIGRANTS_REFUGEES|TEACHERS_SCHOOL|TEACHERS_VET|TRAINERS_ADULT_ED|YOUTH_WORKERS|SENIORS_55PLUS|OTHER",
      "reach": 500,
      "method": "Wie erreichen sie diese Gruppe"
    }
  ],
  "previousProjects": [
    {
      "title": "Projektname",
      "programme": "Erasmus+|Horizon|ESF|etc",
      "year": 2023,
      "role": "COORDINATOR|PARTNER",
      "description": "Kurzbeschreibung"
    }
  ],
  "sectorsActive": ["VET", "ADU", "SCH", "YOU"],
  "workingLanguages": ["DE", "EN"],
  "isNewcomer": false,
  "dataQuality": ${websiteContent ? 80 : 40},
  "notes": "Zusätzliche relevante Informationen UND explizite Auflistung aller fehlenden Pflichtinformationen (z.B. 'Folgende Infos fehlen: OID, Name der primären Kontaktperson...')"
}`;

    const fullPrompt = `${systemContext}\n\n---\n\n${prompt}`;

    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: 0.3, // Niedrigere Temperatur für faktenbasierte Antworten
          maxOutputTokens: 8192,
        },
      }),
    });

    const data = await geminiResponse.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // JSON aus der Antwort extrahieren
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Konnte kein gültiges JSON extrahieren' }, { status: 500 });
    }

    try {
      const partner = JSON.parse(jsonMatch[0]);

      // Zusätzliche Metadaten hinzufügen
      partner.extractionMethod = websiteContent ? 'website_content' : 'url_only';
      partner.websiteFetched = !!websiteContent;

      return NextResponse.json({ partner });
    } catch (e) {
      return NextResponse.json({ error: 'JSON-Parsing fehlgeschlagen' }, { status: 500 });
    }

  } catch (error) {
    console.error('Extract partner error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/**
 * Extrahiert lesbaren Text aus HTML
 */
function extractTextFromHTML(html: string): string {
  // Entferne Script und Style Tags komplett
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  text = text.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ');

  // Entferne HTML-Kommentare
  text = text.replace(/<!--[\s\S]*?-->/g, ' ');

  // Ersetze Block-Elemente mit Zeilenumbrüchen
  text = text.replace(/<\/(div|p|h[1-6]|li|tr|section|article|header|footer|nav|aside)>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<hr\s*\/?>/gi, '\n---\n');

  // Extrahiere wichtige Attribute (Links, Emails)
  const emails = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const phones = html.match(/[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}/g) || [];

  // Entferne alle verbleibenden HTML-Tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Dekodiere HTML-Entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));

  // Bereinige Whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n/g, '\n\n');
  text = text.trim();

  // Füge gefundene Kontaktdaten hinzu
  if (emails.length > 0 || phones.length > 0) {
    text += '\n\n=== GEFUNDENE KONTAKTDATEN ===\n';
    if (emails.length > 0) {
      text += `Emails: ${[...new Set(emails)].join(', ')}\n`;
    }
    if (phones.length > 0) {
      text += `Telefon: ${[...new Set(phones.slice(0, 10))].join(', ')}\n`;
    }
  }

  return text;
}
