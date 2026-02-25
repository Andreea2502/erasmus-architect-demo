/**
 * API Route: Studien-Zusammenfassung
 * ===================================
 * Analysiert hochgeladene Studien/Dokumente und erstellt
 * eine strukturierte Zusammenfassung mit den wichtigsten Erkenntnissen
 */

import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent`;

export async function POST(request: NextRequest) {
  try {
    const {
      documentText,
      documentName,
      documentType = 'study',
      language = 'de'
    } = await request.json() as {
      documentText: string;
      documentName: string;
      documentType?: 'study' | 'statistics' | 'programme_guide' | 'partner_info' | 'previous_project' | 'reference' | 'other';
      language: string;
    };

    if (!documentText || documentText.length < 20) {
      return NextResponse.json({
        error: 'Dokumenttext zu kurz oder nicht vorhanden'
      }, { status: 400 });
    }

    // API Key aus Header oder Environment
    const headerApiKey = request.headers.get('x-gemini-api-key');
    const apiKey = headerApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        error: 'Gemini API Key nicht konfiguriert'
      }, { status: 500 });
    }

    // Starke Sprachanweisungen - am Anfang UND Ende des Prompts
    const langInstructions: Record<string, { start: string; end: string; exampleTerms: Record<string, string> }> = {
      de: {
        start: '⚠️ KRITISCHE ANWEISUNG: Deine GESAMTE Antwort MUSS auf DEUTSCH sein! Alle Texte, Zusammenfassungen, Beschreibungen - alles auf Deutsch!',
        end: '\n\n🔴 SPRACHE: Schreibe ALLES auf DEUTSCH! Keine englischen Texte in den JSON-Werten! Übersetze alles ins Deutsche!',
        exampleTerms: { summary: 'Zusammenfassung', competence: 'Kompetenz', targetGroup: 'Zielgruppe' }
      },
      en: {
        start: '⚠️ CRITICAL: Your ENTIRE response MUST be in ENGLISH! All texts, summaries, descriptions - everything in English!',
        end: '\n\n🔴 LANGUAGE: Write EVERYTHING in ENGLISH! No non-English text in JSON values!',
        exampleTerms: { summary: 'Summary', competence: 'Competence', targetGroup: 'Target Group' }
      },
      es: {
        start: '⚠️ CRÍTICO: Tu respuesta COMPLETA DEBE estar en ESPAÑOL! Todos los textos, resúmenes, descripciones - todo en español!',
        end: '\n\n🔴 IDIOMA: Escribe TODO en ESPAÑOL! No uses textos en otros idiomas en los valores JSON!',
        exampleTerms: { summary: 'Resumen', competence: 'Competencia', targetGroup: 'Grupo objetivo' }
      },
      fr: {
        start: '⚠️ CRITIQUE: Ta réponse ENTIÈRE DOIT être en FRANÇAIS! Tous les textes, résumés, descriptions - tout en français!',
        end: '\n\n🔴 LANGUE: Écris TOUT en FRANÇAIS! Pas de textes dans d\'autres langues dans les valeurs JSON!',
        exampleTerms: { summary: 'Résumé', competence: 'Compétence', targetGroup: 'Groupe cible' }
      },
      it: {
        start: '⚠️ CRITICO: La tua risposta INTERA DEVE essere in ITALIANO! Tutti i testi, riassunti, descrizioni - tutto in italiano!',
        end: '\n\n🔴 LINGUA: Scrivi TUTTO in ITALIANO! Nessun testo in altre lingue nei valori JSON!',
        exampleTerms: { summary: 'Riassunto', competence: 'Competenza', targetGroup: 'Gruppo target' }
      },
      ro: {
        start: '⚠️ CRITIC: Răspunsul tău ÎNTREG TREBUIE să fie în ROMÂNĂ! Toate textele, rezumatele, descrierile - totul în română!',
        end: '\n\n🔴 LIMBĂ: Scrie TOTUL în ROMÂNĂ! Fără texte în alte limbi în valorile JSON!',
        exampleTerms: { summary: 'Rezumat', competence: 'Competență', targetGroup: 'Grup țintă' }
      },
      hr: {
        start: '⚠️ KRITIČNO: Tvoj CIJELI odgovor MORA biti na HRVATSKOM! Svi tekstovi, sažeci, opisi - sve na hrvatskom!',
        end: '\n\n🔴 JEZIK: Piši SVE na HRVATSKOM! Bez tekstova na drugim jezicima u JSON vrijednostima!',
        exampleTerms: { summary: 'Sažetak', competence: 'Kompetencija', targetGroup: 'Ciljna skupina' }
      },
    };

    const currentLang = langInstructions[language] || langInstructions.de;

    // Dokument auf max. 30000 Zeichen begrenzen für API-Limits
    const truncatedText = documentText.length > 30000
      ? documentText.substring(0, 30000) + '\n\n[... Text wurde gekürzt ...]'
      : documentText;

    // Branching Logic for Prompt based on document type (user-selected or detected from filename)
    let prompt = "";

    // Detect document type from user selection OR filename fallback
    const isPartnerDoc = documentType === 'partner_info' ||
      documentName.toLowerCase().includes('pif') ||
      documentName.toLowerCase().includes('profile') ||
      documentName.toLowerCase().includes('partner');

    const isProjectDoc = documentType === 'previous_project' ||
      documentName.toLowerCase().includes('project') ||
      documentName.toLowerCase().includes('report') ||
      documentName.toLowerCase().includes('bericht');

    if (isPartnerDoc) {
      // PARTNER PROFILE MODE
      prompt = `${currentLang.start}

Du bist ein Experte für Erasmus+ Partnervalidierung.
DOKUMENT: "${documentName}" (Partner Profile / PIF)
TEXT:
${truncatedText}

AUFGABE:
Analysiere dieses Partnerprofil (PIF) oder diese Organisationsbeschreibung. Extrahiere ALLE strukturierten Daten für einen Erasmus+ Antrag.

Antworte NUR als valides JSON:
{
  "title": "Name der Organisation",
  "authors": [],
  "year": 2024,
  "type": "other",
  "executiveSummary": "Prägnante Zusammenfassung der Organisation (max 3 Sätze). Fokus auf Expertise und Relevanz.",

  "mission": "Mission Statement oder Hauptziele der Organisation.",
  "staffSize": "Größe der Belegschaft bzw. des Teams (z.B. '10-20', '50+', 'Small team of 5')",

  "erasmusData": {
    "oid": "OID Nummer falls gefunden (E12345678)",
    "pic": "PIC Nummer falls gefunden",
    "accreditation": "Akkreditierungen falls erwähnt"
  },

  "completedProjects": [
    {
      "title": "Projekttitel",
      "role": "COORDINATOR oder PARTNER",
      "programme": "Erasmus+, Horizon, National, etc.",
      "year": 2023,
      "topic": "Thema des Projekts"
    }
  ],

  "competences": ["Kernkompetenz 1", "Kernkompetenz 2 (z.B. Inklusion, Digitalisierung)"],
  "targetGroups": ["Zielgruppe 1", "Zielgruppe 2"],
  "relevantSectors": ["ADU", "VET", "SCH", "YOU"],

  "keyFindings": [
    {
      "finding": "Wichtige Erkenntnis über die Organisation",
      "relevance": "Warum ist das für EU-Projekte relevant?"
    }
  ],
  "statistics": [
    {
      "metric": "z.B. '500+ Teilnehmer erreicht', '15 Jahre Erfahrung', '20 Partnerländer'",
      "context": "Kontext der Zahl",
      "source": "Wo im Dokument"
    }
  ],
  "recommendations": ["Was die Organisation für Projekte empfiehlt oder anbietet"],
  "usefulForProposal": {
    "impact": "Welchen Impact kann dieser Partner in ein Konsortium einbringen?",
    "methodology": "Welche methodischen Ansätze/Expertise bietet der Partner?",
    "dissemination": "Welche Verbreitungskanäle/Reichweite hat der Partner?"
  },
  "keyTerms": ["Schlagwort1", "Schlagwort2"],
  "extractedPartnerData": {
    "email": "Allgemeine E-Mail Adresse falls vorhanden",
    "phone": "Telefonnummer falls vorhanden",
    "website": "Domain/Website falls vorhanden",
    "city": "Stadt des Hauptsitzes falls vorhanden"
  }
}

WICHTIG:
- Extrahiere ALLE Informationen die im Text stehen - lass nichts weg!
- Bei statistics: Suche nach ALLEN Zahlen und Metriken (Reichweite, Jahre Erfahrung, Anzahl Projekte, Teilnehmer, Länder, etc.)
- Bei keyFindings: Fasse die wichtigsten Stärken und USPs der Organisation zusammen
- Bei competences: Liste ALLE genannten Fähigkeiten und Expertisen auf
- Bei targetGroups: Liste ALLE Zielgruppen auf die genannt werden
- Wenn keine Projekte genannt sind, lass das Array leer.
- Sei präzise bei OID/PIC Nummern.
${currentLang.end}`;

    } else if (isProjectDoc) {
      // PROJECT DOCUMENT MODE - for completed/running projects
      prompt = `${currentLang.start}

Du bist ein Experte für EU-Projektdokumentation und Erasmus+ Programme.
DOKUMENT: "${documentName}" (Projektbericht / Projektdokumentation)
TEXT:
${truncatedText}

AUFGABE:
Analysiere dieses Projektdokument (Abschlussbericht, Projektbeschreibung, Results Platform). Extrahiere alle relevanten Informationen für einen neuen Erasmus+ Antrag.

Antworte NUR als valides JSON:
{
  "title": "Projekttitel",
  "authors": ["Koordinator / Konsortium"],
  "year": 2024,
  "type": "previous_project",
  "executiveSummary": "Kurze Zusammenfassung des Projekts (2-3 Sätze): Was wurde erreicht? Welches Problem wurde adressiert?",

  "projectInfo": {
    "programme": "Erasmus+ KA2, Horizon 2020, National, etc.",
    "projectNumber": "Projektnummer falls vorhanden",
    "duration": "z.B. 2022-2024, 24 Monate",
    "budget": "Projektbudget falls genannt",
    "coordinator": "Name der koordinierenden Organisation",
    "partnerCountries": ["DE", "ES", "IT"]
  },

  "keyFindings": [
    {
      "finding": "Wichtigstes Ergebnis/Output des Projekts",
      "relevance": "Wie kann dies für ein neues Projekt nützlich sein?",
      "quotable": "Zitierbarer Satz aus dem Dokument"
    }
  ],

  "results": [
    {
      "title": "Ergebnistitel (z.B. Curriculum, Toolkit, Plattform)",
      "type": "TOOL | CURRICULUM | GUIDE | PLATFORM | TRAINING | OTHER",
      "description": "Kurze Beschreibung des Ergebnisses",
      "link": "URL falls verfügbar"
    }
  ],

  "methodology": "Beschreibung der angewandten Methodik/Ansätze",

  "statistics": [
    {
      "metric": "z.B. '500 Teilnehmer', '8 Partnerländer', '3 Multiplier Events'",
      "context": "Kontext der Zahl",
      "source": "Wo im Dokument"
    }
  ],

  "targetGroups": ["Zielgruppe 1", "Zielgruppe 2"],
  "relevantSectors": ["ADU", "VET", "SCH", "YOU"],

  "lessonsLearned": ["Erkenntnis 1", "Erkenntnis 2"],

  "usefulForProposal": {
    "needsAnalysis": "Wie unterstützt dieses Projekt die Bedarfsanalyse für ein neues Projekt?",
    "methodology": "Welche Methoden könnten übernommen oder weiterentwickelt werden?",
    "impact": "Welche Impact-Indikatoren wurden erreicht?",
    "dissemination": "Welche Verbreitungsstrategien waren erfolgreich?"
  },

  "keyTerms": ["Schlagwort1", "Schlagwort2"],
  "extractedPartnerData": {
    "email": "Allgemeine E-Mail Adresse falls vorhanden",
    "phone": "Telefonnummer falls vorhanden",
    "website": "Domain/Website falls vorhanden",
    "city": "Stadt des Hauptsitzes falls vorhanden"
  }
}

WICHTIG:
- Fokussiere auf ERGEBNISSE und OUTPUTS des Projekts
- Extrahiere alle Zahlen und Statistiken (Teilnehmer, Partner, Events, etc.)
- Bei results: Liste alle konkreten Produkte/Ergebnisse auf
- Bei lessonsLearned: Was hat das Projekt gelernt? Was würde es anders machen?
- Identifiziere Aspekte die für einen neuen Antrag wiederverwendbar sind
${currentLang.end}`;

    } else {
      // STANDARD STUDY MODE (Original Prompt)
      prompt = `${currentLang.start}

Du bist ein wissenschaftlicher Analyst mit Expertise in EU-Bildungsprogrammen und Forschung.
DOKUMENT: "${documentName}"
TYP: ${documentType === 'study' ? 'Wissenschaftliche Studie' : documentType === 'statistics' ? 'Statistischer Bericht' : documentType === 'programme_guide' ? 'Programmleitfaden' : 'Dokument'}

TEXT:
${truncatedText}

AUFGABE:
Erstelle eine umfassende, strukturierte Zusammenfassung dieses Dokuments für die Verwendung in EU-Projektanträgen.

Antworte NUR als valides JSON in diesem Format:
{
  "title": "Titel des Dokuments/der Studie",
  "authors": ["Autor 1", "Autor 2"],
  "year": 2024,
  "type": "study|statistics|guide|other",

  "executiveSummary": "2-3 Sätze Kernaussage des Dokuments",

  "keyFindings": [
    {
      "finding": "Wichtige Erkenntnis 1",
      "relevance": "Warum ist das für EU-Projekte relevant?",
      "quotable": "Direkt zitierbarer Satz aus dem Dokument"
    },
    {
      "finding": "Wichtige Erkenntnis 2",
      "relevance": "Relevanz für EU-Projekte",
      "quotable": "Zitierbarer Satz"
    }
  ],

  "statistics": [
    {
      "metric": "Z.B. 65% der Jugendlichen...",
      "context": "Kontext der Statistik",
      "source": "Seite/Kapitel wenn bekannt"
    }
  ],

  "recommendations": [
    "Empfehlung 1 aus dem Dokument",
    "Empfehlung 2"
  ],

  "targetGroups": ["Zielgruppe 1", "Zielgruppe 2"],

  "relevantSectors": ["ADU", "VET", "SCH", "YOU"],
  "competences": [],

  "keyTerms": ["Begriff 1", "Begriff 2", "Begriff 3"],

  "usefulForProposal": {
    "needsAnalysis": "Wie kann das Dokument die Bedarfsanalyse unterstützen?",
    "methodology": "Welche methodischen Ansätze werden vorgeschlagen?",
    "impact": "Welche Impact-Indikatoren werden genannt?",
    "dissemination": "Hinweise zur Verbreitung/Nachhaltigkeit?"
  },

  "limitations": "Eventuelle Einschränkungen oder Vorsichtshinweise",
  "extractedPartnerData": {
    "email": "Allgemeine E-Mail Adresse falls vorhanden",
    "phone": "Telefonnummer falls vorhanden",
    "website": "Domain/Website falls vorhanden",
    "city": "Stadt des Hauptsitzes falls vorhanden"
  }
}

WICHTIG:
- Extrahiere NUR Informationen die tatsächlich im Dokument stehen
- Bei fehlenden Informationen: leere Arrays [] oder null verwenden
- Zahlen und Statistiken präzise wiedergeben
- "quotable" Felder sollen wörtliche oder nahezu wörtliche Zitate sein
${currentLang.end}`;
    }

    const { generateContentAction } = await import('@/app/actions/gemini');

    let responseText = "";
    try {
      // Use 45 second timeout for document analysis
      responseText = await generateContentAction(prompt, undefined, 0.2, 45000);
    } catch (error: any) {
      console.error('[API/summarize-study] AI Service Error:', error.message);

      // Check for timeout
      if (error.message.includes('timeout')) {
        return NextResponse.json({
          error: 'KI-Analyse dauerte zu lange. Bitte versuchen Sie es erneut.',
          details: error.message
        }, { status: 408 }); // Request Timeout
      }

      return NextResponse.json({
        error: 'KI-Dienst vorübergehend nicht verfügbar',
        details: error.message
      }, { status: 503 });
    }


    // JSON aus Antwort extrahieren
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        error: 'Konnte keine strukturierte Zusammenfassung erstellen'
      }, { status: 500 });
    }

    try {
      const summary = JSON.parse(jsonMatch[0]);

      console.log(`[API/summarize-study] Success. Analyzed ${documentName}`);

      return NextResponse.json({
        summary,
        documentName,
        documentType,
        analyzedAt: new Date().toISOString(),
        textLength: documentText.length,
        wasTruncated: documentText.length > 30000,
      });
    } catch {
      return NextResponse.json({
        error: 'JSON-Parsing der Zusammenfassung fehlgeschlagen'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Summarize study error:', error);
    return NextResponse.json({
      error: (error as Error).message
    }, { status: 500 });
  }
}
