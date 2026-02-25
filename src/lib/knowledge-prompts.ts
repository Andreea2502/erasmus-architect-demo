/**
 * KNOWLEDGE-ENHANCED PROMPTS - Stage 1 Prompt Engineering
 * ========================================================
 *
 * Dieses Modul implementiert fortgeschrittene Prompt-Techniken basierend auf
 * den Knowledge-MD-Files und Erasmus+ Evaluierungsstandards.
 *
 * Features:
 * 1. Evaluator-Scoring-Kriterien (wie echte Gutachter bewerten)
 * 2. Few-Shot-Beispiele (gute vs. schlechte Antworten)
 * 3. Anti-Floskeln-Liste (verbotene generische Phrasen)
 * 4. Kapitelspezifische Anweisungen (aus MD-Files extrahiert)
 */

// ============================================================================
// TYPES
// ============================================================================

interface FewShotExample {
  question: string;
  bad_answer: string;
  good_answer: string;
  explanation: string;
}

interface FewShotCategory {
  [key: string]: FewShotExample;
}

// ============================================================================
// EVALUATOR SCORING CRITERIA
// ============================================================================

/**
 * Echte Erasmus+ Evaluierungskriterien basierend auf dem Programme Guide
 * Gutachter bewerten jeden Bereich mit 0-25 Punkten
 */
export const EVALUATOR_CRITERIA = {
  relevance: {
    maxScore: 25,
    criteria: [
      {
        name: 'Prioritäten-Adressierung',
        weight: 5,
        excellent: 'Projekt adressiert klar 1-2 Prioritäten mit konkreten Aktivitäten, die diese umsetzen',
        weak: 'Priorität wird nur genannt, aber nicht operationalisiert',
        checkQuestion: 'Wird die Priorität durch konkrete Aktivitäten umgesetzt?'
      },
      {
        name: 'Bedarfsanalyse',
        weight: 5,
        excellent: 'Evidenzbasiert mit Eurostat/DESI/PISA Daten, Pre-Project-Survey genannt, konkrete Zahlen',
        weak: 'Behauptungen ohne Quellen, generische Aussagen wie "viele Menschen haben dieses Problem"',
        checkQuestion: 'Werden externe Quellen zitiert? Gibt es konkrete Zahlen?'
      },
      {
        name: 'Zielgruppen-Definition',
        weight: 5,
        excellent: 'Unterscheidung direkt/indirekt, spezifische Demographics (Alter, Region, Charakteristika)',
        weak: '"Die Öffentlichkeit" oder "Schüler" ohne Spezifikation',
        checkQuestion: 'Sind Zielgruppen mit Alter, Region und Anzahl definiert?'
      },
      {
        name: 'SMART-Ziele',
        weight: 5,
        excellent: 'Jedes Ziel ist messbar, zeitgebunden und mit einem Deliverable verknüpft',
        weak: 'Vage Ziele ohne Indikatoren wie "Bewusstsein steigern"',
        checkQuestion: 'Hat jedes Ziel einen messbaren Indikator und ein Ergebnis?'
      },
      {
        name: 'EU-Mehrwert',
        weight: 5,
        excellent: 'Klare Argumentation warum transnational nötig (Vergleich, Transfer, Standardisierung)',
        weak: 'Projekt könnte auch national durchgeführt werden',
        checkQuestion: 'Wird erklärt, warum nur ein EU-Projekt dieses Problem lösen kann?'
      }
    ]
  },

  quality: {
    maxScore: 25,
    criteria: [
      {
        name: 'Logische Kohärenz',
        weight: 5,
        excellent: 'Wasserfall-Logik: Research → Development → Testing → Dissemination, klare Abhängigkeiten',
        weak: 'Aktivitäten sind unzusammenhängend, keine erkennbare Reihenfolge',
        checkQuestion: 'Bauen die WPs logisch aufeinander auf?'
      },
      {
        name: 'Methodik-Beschreibung',
        weight: 5,
        excellent: 'Konkrete Methoden genannt (PDCA-Zyklus, Design Thinking, Kirkpatrick-Modell)',
        weak: 'Generische Aussagen wie "wir nutzen moderne Methoden"',
        checkQuestion: 'Werden spezifische, etablierte Methodiken genannt?'
      },
      {
        name: 'Risikomanagement',
        weight: 5,
        excellent: 'Risikomatrix mit Wahrscheinlichkeit×Auswirkung, konkrete Mitigationsstrategien',
        weak: '"Wir erwarten keine Risiken" oder nur 1-2 triviale Risiken',
        checkQuestion: 'Gibt es eine Risikotabelle mit mindestens 4 realistischen Risiken?'
      },
      {
        name: 'Qualitätssicherung',
        weight: 5,
        excellent: 'QA-Plan mit Peer-Review-Verfahren, unabhängiger Quality Manager, KPIs pro WP',
        weak: '"Wir werden auf Qualität achten" ohne konkrete Maßnahmen',
        checkQuestion: 'Sind Peer-Reviews und ein QA-Verantwortlicher definiert?'
      },
      {
        name: 'Ressourcen-Planung',
        weight: 5,
        excellent: 'Budget-Aufteilung nach WPs begründet, Shadow-Calculation nachvollziehbar',
        weak: 'Keine Budgetbegründung, alle Partner erhalten gleich viel ohne Logik',
        checkQuestion: 'Ist die Budget-Verteilung basierend auf Aufgaben begründet?'
      }
    ]
  },

  partnership: {
    maxScore: 25,
    criteria: [
      {
        name: 'Komplementarität',
        weight: 5,
        excellent: 'Tech+Touch-Logik: Jeder Partner hat einzigartige, unverzichtbare Rolle',
        weak: 'Alle Partner machen das Gleiche oder einer macht nur "Logistik"',
        checkQuestion: 'Hat jeder Partner eine klar differenzierte Rolle?'
      },
      {
        name: 'Aufgabenverteilung',
        weight: 5,
        excellent: 'Lead/Support pro WP definiert, Balance zwischen Koordinator und Partnern',
        weak: 'Koordinator macht alles, Partner sind "Beobachter"',
        checkQuestion: 'Sind alle Partner in inhaltliche WPs als Lead oder Co-Lead eingebunden?'
      },
      {
        name: 'Kommunikation',
        weight: 5,
        excellent: 'Tiered System: Wöchentlich operativ, monatlich strategisch, Tools genannt (Slack, Trello)',
        weak: '"Wir kommunizieren regelmäßig" ohne Frequenz oder Werkzeuge',
        checkQuestion: 'Sind Kommunikationsrhythmen und digitale Tools konkret genannt?'
      },
      {
        name: 'Erfahrung',
        weight: 5,
        excellent: 'Relevante EU-Projekte und thematische Expertise pro Partner dokumentiert',
        weak: 'Keine vorherigen Projekte genannt oder irrelevante Projekte',
        checkQuestion: 'Haben die Partner nachweisbare EU-Projekterfahrung oder relevante Expertise?'
      },
      {
        name: 'Geografische/Sektorale Diversität',
        weight: 5,
        excellent: 'Mix aus Regionen (West/Ost), Sektoren (Uni, NGO, Unternehmen) und Erfahrungslevel',
        weak: 'Alle Partner aus einem Land oder alle vom gleichen Typ',
        checkQuestion: 'Gibt es geografische und sektorale Diversität im Konsortium?'
      }
    ]
  },

  impact: {
    maxScore: 25,
    criteria: [
      {
        name: 'KPI-Definition',
        weight: 5,
        excellent: 'Quantitative UND qualitative Indikatoren mit Zielwerten und Messmethoden',
        weak: 'Keine Zahlen, nur "wir hoffen auf positive Effekte"',
        checkQuestion: 'Gibt es konkrete KPIs mit Zielwerten (z.B. 40 Teilnehmer, 80% Zufriedenheit)?'
      },
      {
        name: 'Mehrebenen-Impact',
        weight: 5,
        excellent: 'Unterscheidung lokal/regional/national/europäisch mit konkreten Effekten pro Ebene',
        weak: 'Nur ein vager "großer Impact" ohne Differenzierung',
        checkQuestion: 'Werden Auswirkungen auf verschiedenen Ebenen differenziert beschrieben?'
      },
      {
        name: 'Dissemination',
        weight: 5,
        excellent: 'Phasen-Modell (Awareness→Engagement→Transfer), Multiplier Events mit Zahlen',
        weak: '"Wir posten auf Social Media" als einzige Strategie',
        checkQuestion: 'Gibt es einen strukturierten Disseminationsplan mit verschiedenen Kanälen?'
      },
      {
        name: 'Nachhaltigkeit',
        weight: 5,
        excellent: '3-Säulen-Modell (finanziell, institutionell, inhaltlich), OER-Publikation zugesagt',
        weak: '"Das Projekt endet nach der Förderung"',
        checkQuestion: 'Wird erklärt, wie Ergebnisse nach Förderende weiterbestehen?'
      },
      {
        name: 'Transferierbarkeit',
        weight: 5,
        excellent: 'Explizites Skalierungsmodell, andere Länder/Sektoren als potenzielle Nutzer benannt',
        weak: 'Ergebnisse nur für Projektpartner nutzbar',
        checkQuestion: 'Können andere Organisationen die Ergebnisse übernehmen?'
      }
    ]
  }
};

// ============================================================================
// ANTI-PHRASE LIST - Verbotene Floskeln
// ============================================================================

/**
 * Generische Phrasen, die in Erasmus+ Anträgen vermieden werden müssen.
 * Diese signalisieren dem Gutachter fehlende Substanz.
 */
export const ANTI_PHRASES = {
  de: [
    // Vage Bedarfsaussagen
    'viele Menschen',
    'es ist bekannt, dass',
    'heutzutage',
    'in der modernen Welt',
    'es ist wichtig',
    'es ist notwendig',
    'wir finden X wichtig',
    'das Problem ist bekannt',

    // Generische Ziele
    'Bewusstsein steigern',
    'Wissen vermitteln',
    'Kompetenzen fördern',
    'Austausch ermöglichen',
    'Vernetzung fördern',
    'Dialog fördern',
    'Qualität verbessern',
    'positive Entwicklung',

    // Vage Aktivitäten
    'verschiedene Aktivitäten',
    'diverse Maßnahmen',
    'wir werden arbeiten an',
    'es wird getan',
    'regelmäßige Kommunikation',
    'enge Zusammenarbeit',
    'intensive Kooperation',

    // Substanzlose Impact-Aussagen
    'großer Impact',
    'signifikante Wirkung',
    'nachhaltige Effekte',
    'langfristige Auswirkungen',
    'breite Zielgruppe',
    'die Öffentlichkeit',
    'alle Interessierten',

    // Methodische Floskeln
    'moderne Methoden',
    'innovative Ansätze',
    'bewährte Praktiken',
    'Best Practices',
    'state of the art',
    'cutting edge',

    // Qualitätsphrasen ohne Substanz
    'wir achten auf Qualität',
    'höchste Standards',
    'professionelle Durchführung',
    'kompetentes Team'
  ],
  en: [
    'many people',
    'it is well known that',
    'nowadays',
    'in today\'s world',
    'it is important',
    'it is necessary',
    'we believe X is important',
    'the problem is well known',

    'raise awareness',
    'transfer knowledge',
    'develop competences',
    'enable exchange',
    'foster networking',
    'promote dialogue',
    'improve quality',
    'positive development',

    'various activities',
    'diverse measures',
    'we will work on',
    'regular communication',
    'close cooperation',
    'intensive collaboration',

    'great impact',
    'significant effect',
    'sustainable effects',
    'long-term effects',
    'broad target group',
    'the general public',
    'all interested parties',

    'modern methods',
    'innovative approaches',
    'best practices',
    'state of the art',
    'cutting edge',

    'we ensure quality',
    'highest standards',
    'professional implementation',
    'competent team'
  ]
};

// ============================================================================
// FEW-SHOT EXAMPLES - Gute vs. Schlechte Antworten
// ============================================================================

/**
 * Konkrete Beispiele aus den Knowledge-MD-Files für bessere AI-Generierung.
 * Format: { question, bad_answer, good_answer, explanation }
 */
export const FEW_SHOT_EXAMPLES: Record<string, FewShotCategory> = {

  // KAPITEL 3: RELEVANCE
  relevance: {
    priority_addressing: {
      question: 'How does the project address the selected priorities?',
      bad_answer: `Unser Projekt befasst sich mit dem Klimawandel und entspricht damit der
        Priorität 'Environment and fight against climate change'.`,
      good_answer: `Das Projekt adressiert die Priorität 'Environment and fight against climate change',
        indem es ein Curriculum für 'Green Skills' in der Berufsbildung entwickelt (IO2).
        Konkret werden durch die Nutzung des 'CO2-Rechners' für Mobilitäten 50% der Reisen
        durch Züge ersetzt, was direkt zur nachhaltigen Ausrichtung des Programms beiträgt.`,
      explanation: 'Die gute Antwort nennt KONKRETE Aktivitäten (IO2, CO2-Rechner) und ZAHLEN (50%).'
    },

    eu_added_value: {
      question: 'How does the proposal bring added value at European level?',
      bad_answer: 'Wir wollen uns austauschen, weil es interessant ist und wir voneinander lernen können.',
      good_answer: `The problem exists in all partner countries, but manifests differently.
        Only a transnational comparison allows us to identify common denominators.
        We are transferring the expertise from Germany (where AI-literacy is advanced) to
        Romania and Hungary. The project creates a unified European certification which
        allows for mobility of learners across borders.`,
      explanation: 'Die gute Antwort nennt 3 valide EU-Argumente: Vergleich, Transfer, Standardisierung.'
    },

    needs_analysis: {
      question: 'What needs do you want to address by implementing your project?',
      bad_answer: 'Jugendliche haben heutzutage Probleme mit digitalen Kompetenzen und wir wollen helfen.',
      good_answer: `According to the Digital Economy and Society Index (DESI) 2024, 42% of Europeans
        lack basic digital skills. Our needs analysis, conducted via a survey of 200 teachers
        in the partner countries (see Annex), confirmed that 80% feel unprepared to teach
        remote classes. In Romania specifically, the youth unemployment rate in rural areas
        stands at 25%, compared to 10% EU average (Eurostat 2024).`,
      explanation: 'Die gute Antwort zitiert QUELLEN (DESI, Eurostat) und nennt KONKRETE ZAHLEN mit Jahreszahlen.'
    },

    target_groups: {
      question: 'What are the target groups of the project?',
      bad_answer: 'Die Zielgruppe sind Schüler und die breite Öffentlichkeit.',
      good_answer: `DIREKTE Zielgruppe: 40 Jugendarbeiter (8 pro Partnerland), Alter 25-45,
        mindestens 2 Jahre Berufserfahrung in der aufsuchenden Jugendarbeit.

        INDIREKTE Zielgruppe: 200 Roma-Jugendliche (40 pro Land) im Alter von 14-18 Jahren
        in ländlichen Regionen, die von den trainierten Jugendarbeitern betreut werden.`,
      explanation: 'Unterscheidung direkt/indirekt, ZAHLEN pro Land, Altersangaben, spezifische Charakteristika.'
    }
  },

  // KAPITEL 4: PARTNERSHIP
  partnership: {
    formation: {
      question: 'How did you form your partnership?',
      bad_answer: 'Wir sind befreundet und wollten zusammenarbeiten.',
      good_answer: `The partnership was formed through a targeted search for complementary expertise.
        The Coordinator (AI-Guide, Austria) provides the technological infrastructure and
        pedagogical framework ("Tech"). Partner 2 (NGO Romania) provides contextual access
        and social validation ("Touch") - they have 15 years of experience working with
        Roma communities. This symbiosis ensures that technology meets local reality.`,
      explanation: 'Die gute Antwort nutzt die Tech+Touch-Formel und zeigt KOMPLEMENTARITÄT, nicht Freundschaft.'
    },

    task_allocation: {
      question: 'What is the task allocation and how does it reflect the commitment of partners?',
      bad_answer: 'Der Partner macht das Marketing und die Logistik für Events.',
      good_answer: `Task allocation follows specific strengths:
        - Coordinator (Austria): Leads WP2 (Development), WP3 (Platform Architecture).
          High expertise justifies senior rates (500€/day) for fewer days.
        - Partner RO: Leads WP4 (Piloting). NOT just logistics - they actively ADAPT
          the curriculum to local cultural context, ensuring accessibility for the
          vulnerable target group. High volume (80 days) at efficient rates (250€/day).`,
      explanation: 'Jeder Partner hat INHALTLICHE Rolle, nicht nur Logistik. Budget-Logik erklärt.'
    },

    coordination: {
      question: 'Describe the mechanism for coordination and communication.',
      bad_answer: 'Wir kommunizieren regelmäßig per E-Mail und treffen uns manchmal.',
      good_answer: `We utilize a tiered communication strategy:
        - WEEKLY: Stand-up calls (15 min) for operational staff via Zoom
        - MONTHLY: Steering Committee meeting (60 min) via MS Teams for strategic decisions
        - QUARTERLY: Detailed progress review with KPI analysis
        - BI-ANNUALLY: Physical TPMs (3 total)

        Tools: Trello for task management, Google Drive for documents (GDPR-compliant),
        Slack for daily async communication. Green Travel: Van journeys (12h) are used
        as "Mobile Steering Meetings" for intensive planning.`,
      explanation: 'FREQUENZEN, KONKRETE TOOLS, Green Travel-Hack für Anreisezeit.'
    }
  },

  // KAPITEL 5: IMPACT
  impact: {
    evaluation: {
      question: 'How are you going to assess if the project objectives have been achieved?',
      bad_answer: 'Wir werden sehen, ob die Teilnehmer zufrieden sind.',
      good_answer: `We utilize a Mixed-Method Assessment Framework:

        QUANTITATIVE KPIs:
        - 40 youth workers trained (8 per country) - verified via certificates
        - 80% satisfaction rate (target: 4/5 stars) - post-training survey
        - Platform usage: 500 logins in first 6 months - analytics dashboard

        QUALITATIVE Indicators (Kirkpatrick Level 2-3):
        - "Delta of Competence": Pre/Post self-assessment based on DigComp 2.2
        - Focus group interviews (2 per country) to measure behavior change
        - 6-month follow-up: Are tools actually used in daily work?`,
      explanation: 'KPI-Tabelle mit ZIELWERTEN, MESSMETHODEN, Kirkpatrick-Modell genannt.'
    },

    sustainability: {
      question: 'How will you ensure the sustainability of the project results?',
      bad_answer: 'Wir hoffen, dass die Ergebnisse auch nach dem Projekt genutzt werden.',
      good_answer: `Sustainability is built on THREE PILLARS:

        1. TRANSFER OF COMPETENCE: The 12-month license budget is "Seed Funding" for
           capacity building. The real result is Prompt Engineering Skills - these stay
           with staff permanently, allowing switch to free alternatives (ChatGPT Free).

        2. INSTITUTIONAL INTEGRATION: Partner NGO commits to integrating the AI-Support-
           Module into their standard youth counseling protocol (Letter of Intent attached).

        3. OPEN EDUCATIONAL RESOURCES: All materials published under CC-BY-SA 4.0 on
           EPALE and OER Commons, hosted for 5 years minimum.`,
      explanation: '3-Säulen-Modell, Lizenz-Argumentation, OER-Verpflichtung, konkrete Plattformen.'
    },

    dissemination: {
      question: 'How do you plan to disseminate the results of the project?',
      bad_answer: 'Wir werden auf Social Media posten und eine Website machen.',
      good_answer: `Dissemination follows a PHASE MODEL:

        PHASE 1 - AWARENESS (during project):
        - Social Media Campaign "Slow Travel, Fast Tech" documenting green journey (Van/Train)
        - Monthly blog posts on project website and EPALE

        PHASE 2 - ENGAGEMENT (at events):
        - 4 Multiplier Events (1 per country, 50 local + 10 international participants each)
        - Open Day during AI-Camp: Invitation to local politicians and press

        PHASE 3 - TRANSFER (post-project):
        - Webinar series for partner NGOs (6 sessions)
        - Policy paper submitted to national education ministries`,
      explanation: 'Phasen-Modell, ZAHLEN für Events, Green-Storytelling, politischer Transfer.'
    }
  },

  // KAPITEL 6: WORK PACKAGES (WP1 Management)
  workpackages: {
    monitoring: {
      question: 'How will the progress, quality and achievement of project activities be monitored?',
      bad_answer: 'Wir werden auf hohe Qualität achten und regelmäßig den Fortschritt prüfen.',
      good_answer: `The consortium implements a Quality Assurance Plan (QAP) based on the PDCA cycle:

        MONITORING INSTRUMENTS:
        1. Traffic-Light-System on Trello:
           - Green: On schedule
           - Yellow: Delay <2 weeks → Warning to coordinator
           - Red: Delay >2 weeks → Emergency Steering Committee

        2. Peer-Review for all deliverables: Each output reviewed by 2 non-author
           partners using standardized checklist (relevance, accessibility, language).

        KPIs FOR WP1:
        - Deliverable punctuality: Target 100% (±10 days tolerance)
        - TPM attendance: Target 100% of partners represented
        - Partner satisfaction: Target Ø 4.0/5.0 (semi-annual survey)`,
      explanation: 'PDCA genannt, Ampelsystem erklärt, Peer-Review-Verfahren, konkrete KPIs mit Zielwerten.'
    },

    risk_management: {
      question: 'What are your plans for handling risks?',
      bad_answer: 'Wir erwarten keine größeren Risiken, aber falls Probleme auftreten, werden wir sie lösen.',
      good_answer: `Risk Management is integral to every Steering Committee meeting. We maintain
        a dynamic Risk Register (reviewed quarterly).

        RISK MATRIX (Probability × Impact):

        | Risk | P×I | Prevention | Response |
        |------|-----|------------|----------|
        | Partner delivers late | 3×4=12 | Clear briefings, interim deadlines | Step-in clause: 10-day ultimatum, then budget reallocation |
        | Key staff leaves | 2×3=6 | Knowledge Wiki, not in heads | Partner names replacement within 2 weeks |
        | Target group not reached | 2×4=8 | Associated Partners as multipliers | Switch to hybrid format, lower barriers |
        | Internal conflict | 2×5=10 | Detailed Partnership Agreement | Escalation: 1) Mediation 2) Majority vote 3) NA consultation |

        Conflicts resolved via: Consensus → Simple Majority → Coordinator Casting Vote.`,
      explanation: 'Risikomatrix mit Wahrscheinlichkeit×Auswirkung, KONKRETE Mitigationen, Eskalationspfad.'
    },

    budget_time: {
      question: 'How will you ensure proper budget control and time management?',
      bad_answer: 'Da es eine Pauschale ist, müssen wir kein detailliertes Budget führen.',
      good_answer: `Despite Lump Sum funding, we implement strict internal Shadow Budgeting:

        TIME MANAGEMENT:
        - Gantt Chart as "living document" in cloud
        - Critical Path identified: Platform (WP3) must finish before Piloting (WP4)
        - Internal deadlines: 14 days before official milestones (buffer for iterations)

        BUDGET CONTROL:
        - Quarterly internal financial reports (timesheets, travel receipts)
        - Disbursement model:
          * Tranche 1: 40% at contract signing
          * Tranche 2: 40% after interim report + proof that 70% of T1 "consumed"
          * Tranche 3: 20% after final report approval
        - Non-delivery clause: Budget withheld if WP outputs not provided`,
      explanation: 'Shadow Budget erklärt, Tranchen-System, Critical Path Methode, Konsequenzen bei Nicht-Lieferung.'
    }
  }
};

// ============================================================================
// CHAPTER-SPECIFIC INSTRUCTIONS (aus MD-Files extrahiert)
// ============================================================================

/**
 * Kapitelspezifische Anweisungen für den AI-Generator.
 * Diese kommen direkt aus den Knowledge-MD-Files.
 */
export const CHAPTER_INSTRUCTIONS = {
  context: {
    title: 'Kapitel 1: Context',
    corePrinciples: [
      'Titel-Qualität: Informativ UND einprägsam, wie eine Visitenkarte',
      'Akronym-Regel: Niemals erzwungen - MUSS aber zwingend aus englischen Wörtern abgeleitet sein (z.B. DigiYouth, AIducate)',
      'Dauer-Logik: Muss zur WP-Komplexität passen (IT-Plattform = 36 Monate)',
      'Konsistenz-Check: Alle Angaben müssen mit späteren Kapiteln übereinstimmen'
    ],
    formatRules: [
      'Projekttitel: max. 15 Wörter, Thema + Zielgruppe + Methode',
      'Akronym: 5-8 Buchstaben, aussprechbar, basierend auf englischen Begriffen',
      'Startdatum: 1. des Monats, nicht in Urlaubszeiten'
    ]
  },

  organisations: {
    title: 'Kapitel 2: Participating Organisations',
    corePrinciples: [
      'Kein Partner ohne Rolle: Jeder Partner MUSS eine unverzichtbare Aufgabe haben',
      'Diversität = Qualität: Mix aus Sektoren, Regionen, Erfahrungslevel',
      'Der Koordinator ist entscheidend: EU-Projekterfahrung MUSS nachgewiesen sein',
      'Budget folgt Rolle: Ungleiche Verteilung ist KEIN Problem, wenn begründet'
    ],
    formatRules: [
      'Tech+Touch-Strategie: West = Methodik, Ost = Zugang zur Zielgruppe',
      'Keine "Reisebüros": Osteuropäische Partner sind CO-CREATORS, nicht Logistiker',
      'Associated Partners strategisch nutzen für Glaubwürdigkeit'
    ]
  },

  relevance: {
    title: 'Kapitel 3: Relevance of the Project',
    corePrinciples: [
      'Prioritäten-Adressierung: Immer durch KONKRETE AKTIVITÄTEN operationalisieren',
      'Problem-Tree-Analyse nutzen: Stamm (Problem), Wurzeln (Ursachen), Äste (Konsequenzen)',
      'Bedarfsanalyse evidenzbasiert: IMMER externe Quellen zitieren (Eurostat, DESI, PISA)',
      'Zielgruppen präzise: Direkt vs. Indirekt, mit Alter, Region, Anzahl'
    ],
    formatRules: [
      'Nutze die Formel: "Durch [Aktivität] erreichen wir [Ergebnis]"',
      'SMART-Ziele: Jedes Ziel braucht ein verknüpftes Deliverable',
      'EU-Mehrwert: Vergleich, Transfer ODER Standardisierung als Argument',
      'Vermeide "Waisen-Ziele" (Ziele ohne zugehöriges Ergebnis)'
    ],
    powerWords: ['bridge the gap', 'address the shortcomings', 'urgent need', 'strategic intervention']
  },

  partnership: {
    title: 'Kapitel 4: Partnership and Cooperation Arrangements',
    corePrinciples: [
      'Symbiose betonen: Tech + Access - einer kann nicht ohne den anderen',
      'Keine "Reisebüros": Partner in Osteuropa sind CO-CREATORS durch kulturelle Adaption',
      'Green Travel als Methode: Lange Reisezeiten für "Mobile Meetings" nutzen',
      'Tools nennen: Konkret werden (Trello, Slack, Teams)'
    ],
    formatRules: [
      'Formation: Strategische Suche, nicht Zufall oder Freundschaft',
      'Aufgabenverteilung: Lead/Support pro WP, nicht "einer macht alles"',
      'Kommunikation: 3 Ebenen (strategisch, operativ, finanziell) mit Frequenzen'
    ]
  },

  impact: {
    title: 'Kapitel 5: Impact and Dissemination',
    corePrinciples: [
      'Lizenz-Argumentation: Software-Kosten als "Capacity Building", nicht Mietkosten',
      'Green Storytelling: Dissemination IMMER mit Green-Travel-Komponente verbinden',
      'KPI-Pflicht: KEINE Impact-Antwort ohne mindestens 3 konkrete Zahlen',
      'OER-Regel: IMMER Creative Commons Lizenz und Hosting-Plattform nennen'
    ],
    formatRules: [
      'Kirkpatrick-Logik für Trainings: Reaktion → Lernen → Verhalten',
      'Nachhaltigkeit: 3 Säulen (finanziell, institutionell, inhaltlich)',
      'Dissemination: Phasen-Modell (Awareness → Engagement → Transfer)',
      'Impact-Ebenen differenzieren: Lokal → Regional → National → Europäisch'
    ]
  },

  workpackages: {
    title: 'Kapitel 6: Implementation (Work Packages)',
    corePrinciples: [
      'Wasserfall-Logik: WP2-Ergebnisse VOR WP3-Start, WP3-Produkte VOR WP4-Training',
      'Budget-Balance: WP2 10-15%, WP3 40-50%, WP4 20-25%, WP5 10-15%',
      'West-Partner: High-Level Expertise, Innovation, Methodology → hohe Tagessätze',
      'Ost-Partner: Access to Target Group, Large Scale Testing → viele Tage, effizient'
    ],
    formatRules: [
      'WP1 Management: Max 20% des Budgets, PDCA-Zyklus, Risikomatrix obligatorisch',
      'Aktivitäten: 4-Punkt-Beschreibung (Content, Objectives Alignment, Results, Participants)',
      'Shadow Calculation: Intern kalkulieren, extern nicht detaillieren'
    ],
    wp1Specifics: {
      questions: [
        'Monitoring: QAP, PDCA-Zyklus, Ampelsystem, Peer-Review',
        'Personal & Timing: Rollenprofile, rhythmisiertes Management',
        'Budget & Zeit: Shadow Budgeting, Critical Path, Tranchen',
        'Risikomanagement: Matrix mit Wahrscheinlichkeit × Auswirkung',
        'Inklusion: Barrierefreie Kommunikation, inklusive Meetings',
        'Digitalisierung: Virtual Project Office, Tools GDPR-konform',
        'Green: Sustainable Travel Policy, Digital First, Paperless',
        'Partizipation: Interne Demokratie, Stakeholder Advisory Board'
      ]
    }
  },

  summary: {
    title: 'Kapitel 7: Project Summary',
    corePrinciples: [
      'Der "Elevator Pitch": Nach dem Lesen MUSS der Gutachter wissen, worum es geht',
      'Keine neuen Informationen: Summary ist DESTILLATION, keine Ergänzung',
      'Zahlen wirken: Immer konkrete Zahlen nennen (40 Teilnehmer, 5 Module)',
      'Struktur-Regel: Objectives → Activities → Results (immer diese Reihenfolge)'
    ],
    formatRules: [
      'Objectives: Max. 3-4 SMART-Ziele, verknüpft mit Deliverables',
      'Implementation: Chronologische Logik (Research → Development → Testing → Dissemination)',
      'Results: Outputs (tangible) vs. Outcomes (intangible) unterscheiden',
      'Länge: Ca. 150-200 Wörter pro Abschnitt'
    ]
  }
};

// ============================================================================
// PROMPT ENHANCEMENT FUNCTION
// ============================================================================

/**
 * Erweitert einen Standard-Prompt mit Knowledge-basierten Verbesserungen
 */
export function enhancePrompt(
  basePrompt: string,
  chapterId: number,
  language: 'de' | 'en' = 'de'
): string {
  // Map chapter IDs to sections
  const chapterMap: Record<number, keyof typeof CHAPTER_INSTRUCTIONS> = {
    1: 'context',
    2: 'organisations',
    3: 'relevance',
    4: 'partnership',
    5: 'impact',
    6: 'workpackages',
    7: 'summary'
  };

  const chapterKey = chapterMap[chapterId];
  if (!chapterKey) return basePrompt;

  const instructions = CHAPTER_INSTRUCTIONS[chapterKey];
  const antiPhrases = ANTI_PHRASES[language];

  // Get relevant few-shot examples
  const fewShotKey = chapterKey === 'workpackages' ? 'workpackages' : chapterKey;
  const examples = FEW_SHOT_EXAMPLES[fewShotKey as keyof typeof FEW_SHOT_EXAMPLES];

  // Build enhanced prompt
  let enhanced = basePrompt;

  // Add chapter-specific instructions
  enhanced += `

=== KAPITEL-SPEZIFISCHE ANWEISUNGEN (${instructions.title}) ===
KERNPRINZIPIEN:
${instructions.corePrinciples.map(p => `• ${p}`).join('\n')}

FORMAT-REGELN:
${instructions.formatRules.map(r => `• ${r}`).join('\n')}
`;

  // Add anti-phrase warning
  enhanced += `

=== VERBOTENE FLOSKELN (NIEMALS VERWENDEN!) ===
Die folgenden generischen Phrasen signalisieren dem Gutachter fehlende Substanz:
${antiPhrases.slice(0, 15).map(p => `❌ "${p}"`).join('\n')}

Stattdessen: IMMER konkrete Zahlen, Methoden, Quellen und Beispiele verwenden!
`;

  // Add few-shot examples if available
  if (examples) {
    const exampleKeys = Object.keys(examples).slice(0, 2); // Max 2 examples per prompt

    enhanced += `

=== BEISPIELE FÜR GUTE VS. SCHLECHTE ANTWORTEN ===
`;
    for (const key of exampleKeys) {
      const ex = examples[key as keyof typeof examples];
      enhanced += `
📌 FRAGE: "${ex.question}"

❌ SCHLECHTE ANTWORT:
"${ex.bad_answer}"

✅ GUTE ANTWORT:
"${ex.good_answer}"

💡 WARUM: ${ex.explanation}
---
`;
    }
  }

  // Add evaluator mindset
  enhanced += `

=== DENKE WIE EIN EVALUATOR ===
Prüfe deine Antwort mit diesen Fragen:
• Sind konkrete ZAHLEN genannt? (Teilnehmer, Prozente, Zeiträume)
• Sind QUELLEN zitiert? (Eurostat, DESI, Programme Guide)
• Sind METHODEN konkret? (PDCA, Kirkpatrick, Design Thinking)
• Ist jede Aussage SPEZIFISCH auf dieses Projekt bezogen?
• Gibt es KEINE der verbotenen Floskeln?
`;

  return enhanced;
}

// ============================================================================
// EXPORTS
// ============================================================================

export function getEvaluatorCriteria(section: 'relevance' | 'quality' | 'partnership' | 'impact') {
  return EVALUATOR_CRITERIA[section];
}

export function getAntiPhrases(language: 'de' | 'en') {
  return ANTI_PHRASES[language];
}

export function getFewShotExamples(chapter: keyof typeof FEW_SHOT_EXAMPLES) {
  return FEW_SHOT_EXAMPLES[chapter];
}

export function getChapterInstructions(chapterId: number) {
  const chapterMap: Record<number, keyof typeof CHAPTER_INSTRUCTIONS> = {
    1: 'context',
    2: 'organisations',
    3: 'relevance',
    4: 'partnership',
    5: 'impact',
    6: 'workpackages',
    7: 'summary'
  };
  return CHAPTER_INSTRUCTIONS[chapterMap[chapterId]];
}
