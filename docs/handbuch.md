---
pdf_options:
  format: A4
  margin: 25mm 20mm 25mm 20mm
  printBackground: true
  headerTemplate: '<div style="font-size:8px; color:#666; width:100%; text-align:right; padding-right:20mm;">Erasmus+ Architect — Benutzerhandbuch</div>'
  footerTemplate: '<div style="font-size:8px; color:#666; width:100%; text-align:center;">Seite <span class="pageNumber"></span> von <span class="totalPages"></span></div>'
  displayHeaderFooter: true
stylesheet: docs/handbuch-style.css
body_class: handbuch
---

<div class="cover-page">
  <div class="cover-badge">KI-GESTÜTZT</div>
  <h1 class="cover-title">Erasmus+ Architect</h1>
  <p class="cover-subtitle">Benutzerhandbuch</p>
  <div class="cover-divider"></div>
  <p class="cover-description">Umfassendes Handbuch für den KI-gestützten<br>Projektassistenten für EU Erasmus+ Anträge</p>
  <div class="cover-meta">
    <p>Version 1.0 — Februar 2026</p>
    <p>Kostenlos & ohne Registrierung</p>
  </div>
</div>

<div class="page-break"></div>

# Inhaltsverzeichnis

1. [Einführung](#1-einführung)
2. [Schnellstart — In 5 Minuten zum ersten Projekt](#2-schnellstart)
3. [Dashboard — Ihr Startpunkt](#3-dashboard)
4. [Partnerverwaltung](#4-partnerverwaltung)
5. [Wissensdatenbank](#5-wissensdatenbank)
6. [Konzeptentwicklung (6-Schritte-Assistent)](#6-konzeptentwicklung)
7. [Projekt-Generator (12-Schritte-Pipeline)](#7-projekt-generator)
8. [Projekt-Evaluator](#8-projekt-evaluator)
9. [Export & Dokumentenerstellung](#9-export)
10. [KI-Chat-Assistent](#10-ki-chat)
11. [Bibliothek](#11-bibliothek)
12. [Tipps & Best Practices](#12-tipps)
13. [Häufige Fragen (FAQ)](#13-faq)
14. [Technische Informationen](#14-technik)

<div class="page-break"></div>

<a name="1-einführung"></a>

## 1. Einführung

### Was ist Erasmus+ Architect?

**Erasmus+ Architect** ist ein KI-gestützter Projektassistent, der Organisationen dabei unterstützt, wettbewerbsfähige Erasmus+ Förderanträge für die Europäische Union zu entwickeln. Das Tool führt Nutzer durch den gesamten Prozess — von der ersten Projektidee bis zum einreichungsfertigen Antrag.

### Für wen ist dieses Tool?

| Zielgruppe | Nutzen |
|:-----------|:-------|
| **Bildungseinrichtungen** | Strukturierte Antragsstellung für Schulpartnerschaften und Hochschulkooperationen |
| **NGOs & Vereine** | Vereinfachter Zugang zu EU-Fördermitteln auch ohne Vorerfahrung |
| **Projektmanager** | Zeitsparende KI-Unterstützung bei der Antragserstellung |
| **Newcomer** | Schritt-für-Schritt-Anleitung durch den gesamten Prozess |

### Kernfunktionen auf einen Blick

<div class="feature-grid">

**Konzeptentwicklung** — 6-Schritte-Assistent zur strukturierten Projektentwicklung von der Idee bis zum Konzeptentwurf

**Projekt-Generator** — 12-Schritte KI-Pipeline zur Beantwortung der offiziellen EU-Antragsformulare

**Projekt-Evaluator** — Qualitätsbewertung nach offiziellen EU-Vergabekriterien (0–100 Punkte)

**Partner-Management** — KI-gestützter Import und Verwaltung von Konsortialpartnern

**Wissensdatenbank** — RAG-System für dokumentenbasierte KI-Antworten

**Export** — Generierung einreichungsfertiger Word-Dokumente (.docx)

</div>

### Unterstützte Erasmus+ Aktionstypen

| Aktionstyp | Beschreibung | Budget | Dauer |
|:-----------|:-------------|:-------|:------|
| **KA210** | Kleine Partnerschaften | 30.000 – 60.000 € | 6 – 24 Monate |
| **KA220** | Kooperationspartnerschaften | ab 120.000 € | 12 – 36 Monate |

### Unterstützte Sektoren

- **ADU** — Erwachsenenbildung
- **VET** — Berufsbildung
- **SCH** — Schulbildung
- **YOU** — Jugend
- **HED** — Hochschulbildung

<div class="page-break"></div>

<a name="2-schnellstart"></a>

## 2. Schnellstart — In 5 Minuten zum ersten Projekt

Dieser Abschnitt zeigt den empfohlenen Workflow vom Start bis zum fertigen Antrag.

### Der Gesamtworkflow

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  VORBEREITUNG │────▶│  KONZEPT-        │────▶│  PROJEKT-        │
│              │     │  ENTWICKLUNG     │     │  GENERATOR       │
│ • Partner    │     │  (6 Schritte)    │     │  (12 Schritte)   │
│ • Wissen     │     │                  │     │                  │
└─────────────┘     └──────────────────┘     └──────────────────┘
                                                      │
                    ┌──────────────────┐               │
                    │  EXPORT &        │◀──────────────┘
                    │  EINREICHUNG     │
                    │                  │
                    │ • Evaluierung    │
                    │ • Word-Export    │
                    └──────────────────┘
```

### Schritt-für-Schritt Kurzanleitung

> **Schritt 1: Partner anlegen**
> Importieren Sie Ihre Projektpartner über den Smart Import (Websites, CSV oder manuell).

> **Schritt 2: Wissensdatenbank befüllen** *(optional)*
> Laden Sie den aktuellen Erasmus+ Programme Guide als PDF hoch.

> **Schritt 3: Neues Projekt starten**
> Klicken Sie auf „Neues Projekt erstellen" und durchlaufen Sie den 6-Schritte Konzeptentwickler.

> **Schritt 4: Antrag generieren**
> Wechseln Sie zum Projekt-Generator und lassen Sie die KI die offiziellen Antragsformulare ausfüllen.

> **Schritt 5: Qualität prüfen**
> Nutzen Sie den Evaluator für eine Bewertung nach EU-Vergabekriterien.

> **Schritt 6: Exportieren**
> Exportieren Sie Ihren fertigen Antrag als Word-Dokument.

<div class="page-break"></div>

<a name="3-dashboard"></a>

## 3. Dashboard — Ihr Startpunkt

Das Dashboard ist die zentrale Startseite der Anwendung und bietet einen Überblick über alle Aktivitäten.

### Aufbau des Dashboards

#### Willkommensbereich

Im oberen Bereich finden Sie die Begrüßung mit dem Titel **„Willkommen zu Erasmus+ Architect"** und der Beschreibung **„Dein KI-gestützter Projektassistent für erfolgreiche EU-Anträge"**.

#### Hero-Bereich

Der große blaue Hero-Bereich zeigt die drei Kernfunktionen des Tools:

- **12-Schritte Pipeline** — Die vollständige Antragsgenerierung
- **Critical Evaluator** — Qualitätsbewertung nach EU-Standards
- **RAG Programme Guide** — KI-gestützte Antworten aus dem Programmleitfaden

Der gelbe Button **„Jetzt starten"** führt direkt zur Projekterstellung. Darunter der Hinweis: *„Kostenlos & ohne Registrierung"*.

#### Schnellzugriff

Vier Karten bieten direkten Zugang zu den wichtigsten Funktionen:

| Karte | Beschreibung | Aktion |
|:------|:-------------|:-------|
| **Partner importieren** | KI analysiert Websites & CSV | Weiterleitung zum Smart Import |
| **Projekt generieren** *(Empfohlen)* | 12-Schritte KI-Pipeline | Weiterleitung zum Projekt-Generator |
| **Wissen hochladen** | Programmleitfaden & Studien | Weiterleitung zur Wissensdatenbank |

#### Letzte Partner & Projekte

Im unteren Bereich zeigt das Dashboard zwei Spalten:

- **Letzte Partner** — Die 4 zuletzt angelegten Organisationen mit Name, Land und Newcomer-Status
- **Letzte Projekte** — Die 4 zuletzt bearbeiteten Projekte mit Akronym, Aktionstyp, Budget und Status

<div class="page-break"></div>

<a name="4-partnerverwaltung"></a>

## 4. Partnerverwaltung

Die Partnerverwaltung ist das Herzstück für den Aufbau Ihres internationalen Konsortiums.

### 4.1 Übersicht

Über den Menüpunkt **„Partner"** erreichen Sie die Partnerübersicht mit allen gespeicherten Organisationen. Hier können Sie:

- Partner durchsuchen und filtern (nach Name, Land, Typ, Expertise)
- Neue Partner hinzufügen
- Bestehende Partner bearbeiten oder löschen

### 4.2 Smart Import — KI-gestützter Partner-Import

Der Smart Import ist das leistungsstärkste Feature der Partnerverwaltung. Er bietet vier Import-Modi:

#### Modus 1: Website-Analyse

1. Navigieren Sie zu **Partner → Smart Import**
2. Wählen Sie den Tab **„Websites"**
3. Fügen Sie eine oder mehrere URLs ein (eine pro Zeile)
4. Wählen Sie oben rechts die **Ausgabesprache** (Deutsch, Englisch, etc.)
5. Klicken Sie auf **„Analysiere mit KI"**
6. Die KI extrahiert automatisch:
   - Organisationsname und Akronym
   - Land, Stadt, Organisationstyp
   - Mission und Tätigkeitsbereiche
   - Kontaktpersonen (Name, Rolle, E-Mail)
   - Expertise-Bereiche mit Kompetenzstufe (1–5)
   - Frühere EU-Projekte

#### Modus 2: Text/CSV-Import

1. Wählen Sie den Tab **„Text/CSV"**
2. Fügen Sie Partnerdaten als Text oder CSV ein
3. Klicken Sie auf **„Analysiere mit KI"**

#### Modus 3: Bild-/Visitenkartenimport

1. Wählen Sie den Tab **„Bild"**
2. Laden Sie ein Foto einer Visitenkarte oder eines Flyers hoch (JPG, PNG)
3. Die KI extrahiert die Kontaktdaten per Bilderkennung

#### Modus 4: Dokumentenimport

1. Wählen Sie den Tab **„Dokument"**
2. Laden Sie ein PDF oder DOCX mit Partnerinformationen hoch
3. Die KI analysiert den Dokumentinhalt

#### Nach dem Import

Für jeden erkannten Partner wird eine Vorschaukarte angezeigt mit:

- **Datenqualität** in Prozent (farbcodiert: grün > 70%, gelb 50–70%, rot < 50%)
- Aufklappbare Detailansicht mit allen extrahierten Daten
- Buttons: **„Speichern"** (grün) oder **„Verwerfen"** (rot)
- Button **„Alle speichern"** für den Massenimport

### 4.3 Manuelles Anlegen

1. Navigieren Sie zu **Partner → Neuen Partner hinzufügen**
2. Füllen Sie das Formular aus:
   - Organisationsname, Akronym, Land, Stadt
   - Organisationstyp und Rechtsform
   - PIC-Nummer und OID (EU-Identifikatoren)
   - Mission, Gründungsjahr, Mitarbeiterzahl
   - Kontaktpersonen
   - Expertise-Bereiche mit Kompetenzstufe
   - Zielgruppen und aktive Sektoren
   - Frühere Projekterfahrung
3. Klicken Sie auf **„Speichern"**

### 4.4 Partnerprofil — Datenfelder

| Feld | Beschreibung | Beispiel |
|:-----|:-------------|:---------|
| **Organisationsname** | Offizieller Name | „Volkshochschule München" |
| **Akronym** | Kurzform | „VHS-M" |
| **Land / Stadt** | Standort | Deutschland, München |
| **Organisationstyp** | Rechtsform | Bildungseinrichtung, NGO, KMU |
| **PIC-Nummer** | EU-Identifikator | 9-stellige Nummer |
| **OID** | Organisation ID | E-Nummer |
| **Expertise** | Fachgebiete (Stufe 1–5) | Digitale Bildung (Stufe 4) |
| **Newcomer** | Erstantragsteller | Ja / Nein |

<div class="page-break"></div>

<a name="5-wissensdatenbank"></a>

## 5. Wissensdatenbank

Die Wissensdatenbank ermöglicht es, Dokumente hochzuladen, die von der KI bei der Antragserstellung als Referenz genutzt werden (RAG-System).

### 5.1 Zugang

Navigieren Sie über das Menü zu **„Wissensdatenbank"** oder nutzen Sie die Schnellzugriffskarte auf dem Dashboard.

### 5.2 Dokumente hochladen

1. Klicken Sie auf den Upload-Bereich oder den Button **„Datei auswählen"**
2. Unterstützte Formate: **PDF**, **Textdateien**, **Bilder**
3. Das Dokument wird automatisch:
   - Hochgeladen und analysiert
   - In Textabschnitte (Chunks) zerlegt
   - Semantisch indexiert für die KI-Suche
4. Fortschritt und Status werden mit einer Fortschrittsleiste angezeigt

### 5.3 Empfohlene Dokumente

| Dokument | Priorität | Beschreibung |
|:---------|:----------|:-------------|
| **Erasmus+ Programme Guide 2026** | Hoch | Offizieller Programmleitfaden der EU-Kommission |
| **Studien & Statistiken** | Mittel | Bedarfsanalysen und Forschungsergebnisse |
| **Best-Practice-Berichte** | Niedrig | Erfahrungsberichte aus früheren Projekten |

> **Wichtig:** Es wird empfohlen, maximal 5 Dokumente hochzuladen. Priorisieren Sie den aktuellen Erasmus+ Programme Guide, da dieser die wichtigste Referenz für die KI-Generierung darstellt.

### 5.4 Verwaltung

Jedes indexierte Dokument zeigt:

- **Dokumentname** und Dateityp-Badge
- **Typ** (z.B. „Programmleitfaden", „Studie")
- **Upload-Datum**
- **Anzahl der Chunks** (Textabschnitte)
- **Seitenanzahl**
- **Zusammenfassung** des Inhalts
- **Löschen-Button** (Papierkorb-Symbol)

Die Buttons **„Alle löschen"** ermöglicht das Zurücksetzen der gesamten Datenbank.

<div class="page-break"></div>

<a name="6-konzeptentwicklung"></a>

## 6. Konzeptentwicklung — Der 6-Schritte-Assistent

Der Konzeptentwickler ist der strukturierte Einstieg in Ihr Erasmus+ Projekt. Er führt Sie in sechs Schritten von der ersten Idee bis zum detaillierten Konzeptentwurf.

### Übersicht der 6 Schritte

| Schritt | Name | Beschreibung |
|:--------|:-----|:-------------|
| 1 | **Deine Projektidee** | Idee erfassen, Sektor & Aktionstyp wählen |
| 2 | **Quellen & Konzepte** | Recherche hochladen, 3 Konzepte generieren |
| 3 | **Konsortium** | Partner auswählen und Rollen zuweisen |
| 4 | **SMART-Ziele** | KI-gestützte Zielsetzung mit Indikatoren |
| 5 | **Work Packages** | Arbeitspakete oder Aktivitäten strukturieren |
| 6 | **Zusammenfassung** | Konzeptentwurf generieren und exportieren |

---

### Schritt 1: Deine Projektidee

Dieser Schritt erfasst Ihre grundlegende Projektidee und die wichtigsten Rahmenbedingungen.

#### Felder ausfüllen

1. **Sektor** — Wählen Sie den Bildungssektor (ADU, VET, SCH, YOU, HED)
2. **Aktionstyp** — KA210 (Klein) oder KA220 (Kooperation)
3. **Erasmus+ Schwerpunkt (Priorität)** — Wählen Sie eine der vier Prioritäten:
   - Inklusion & Vielfalt
   - Digitaler Wandel
   - Umwelt & Nachhaltigkeit
   - Demokratische Teilhabe
4. **Budget (€)** — Wird automatisch vorgeschlagen (KA210: 60.000 €, KA220: 250.000 €)
5. **Dauer (Monate)** — Wird automatisch vorgeschlagen (KA210: 12, KA220: 24)

#### Projektidee eingeben

Im großen Textfeld **„Projektidee — schreib einfach drauf los"** beschreiben Sie Ihre Idee frei:

- Was ist die Kernidee?
- Was wollen Sie erreichen?
- Wen möchten Sie ansprechen?

> **Tipp: Sprachdiktat nutzen** — Klicken Sie auf **„Diktieren"**, um Ihre Idee per Spracherkennung einzugeben. Klicken Sie auf **„Aufnahme stoppen"**, wenn Sie fertig sind.

#### Weitere Felder

- **Zielgruppe** — Beschreiben Sie, wer von dem Projekt profitiert
- **Welches Problem soll gelöst werden?** — Das zugrundeliegende Problem

#### KI-Optimierung

Nachdem Sie die Pflichtfelder ausgefüllt haben, erscheint der Button:

**„Idee aufbereiten & optimieren"**

Die KI reformuliert Ihre Rohidee in eine strukturierte, professionelle Projektbeschreibung.

#### Research-Prompts generieren

Nach der Optimierung können Sie **„Research-Prompts generieren"** klicken. Es erscheinen zwei Prompt-Boxen:

- **Bedarfsanalyse & Datenlage** (blau) — Prompt für die Recherche nach Studien und Statistiken
- **Best Practices & Innovationslücke** (lila) — Prompt für die Recherche nach bestehenden Lösungen

Kopieren Sie diese Prompts mit dem **„Kopieren"**-Button und nutzen Sie sie in externen Recherchetools (z.B. Perplexity, Google Scholar).

---

### Schritt 2: Quellen hochladen & Konzepte generieren

In diesem Schritt laden Sie Ihre Rechercheergebnisse hoch und lassen die KI daraus drei Konzeptvorschläge erstellen.

#### Quellen hochladen

1. Klicken Sie auf **„Dateien hochladen"** (PDF, DOCX, TXT, MD)
2. Oder klicken Sie auf **„Manuell hinzufügen"** für Textquellen
3. Geben Sie jeder Quelle einen **Titel**
4. Die KI analysiert jede Quelle automatisch und extrahiert:
   - Eine **Zusammenfassung**
   - **Quellenbelege** (Key Findings) als Aufzählung

#### Konzepte generieren

1. Sobald Quellen vorhanden sind, klicken Sie auf **„3 Konzeptvorschläge generieren"**
2. Optional: Geben Sie unter **„Prompt-Anweisungen"** zusätzliche Vorgaben ein
3. Die KI generiert **drei verschiedene Konzeptvarianten**

#### Konzepte vergleichen

Jedes Konzept wird als farbige Karte angezeigt mit:

- **Akronym** und **Titel**
- **Problem, Innovation, Zusammenfassung**
- **Geplante Ergebnisse** und **Erasmus+ Prioritäten** als Tags
- **Stern-Symbol** zum Speichern in der Bibliothek

Wählen Sie Ihr bevorzugtes Konzept mit **„Dieses Konzept wählen"**.

#### KI-Bewertung

Klicken Sie auf **„KI-Bewertung starten"**, um eine vergleichende Analyse zu erhalten:

- **Empfehlung der KI** mit dem besten Konzept
- Für jedes Konzept: **Stärken**, **Schwächen** und **Verbesserungstipp**

---

### Schritt 3: Konsortium zusammenstellen

Hier wählen Sie die Partnerorganisationen für Ihr Projektkonsortium.

#### Anforderungen

Die Mindestanforderungen werden als farbiger Hinweis angezeigt:

- **KA210:** Mindestens 2 Partner aus 2 verschiedenen Ländern
- **KA220:** Mindestens 3 Partner aus 3 verschiedenen Ländern

#### Partner auswählen

1. Durchsuchen Sie die Partnerliste über das **Suchfeld**
   - Suche nach: Name, Land, Typ, Expertise
2. Setzen Sie den **Haken** neben den gewünschten Partnern
3. Ausgewählte Partner erscheinen im oberen Bereich

#### Rollen zuweisen

Für jeden ausgewählten Partner:

- Wählen Sie die **Rolle**: *Koordinator* oder *Partner*
- Es kann nur **einen Koordinator** geben
- Entfernen Sie Partner über den **Löschen-Button**

> **Hinweis:** Haben Sie noch keine Partner angelegt? Nutzen Sie den Link **„Partner anlegen"**, der Sie direkt zur Partnerverwaltung führt.

---

### Schritt 4: SMART-Ziele & Ergebnisse

Die KI generiert messbare Projektziele nach dem SMART-Prinzip.

#### SMART-Ziele generieren

1. Klicken Sie auf **„SMART-Ziele generieren"** (grüner Button)
2. Optional: Geben Sie **Prompt-Anweisungen** für spezifische Vorgaben ein
3. Die KI erstellt 3–5 Ziele basierend auf:
   - Ihrem ausgewählten Konzept
   - Den analysierten Quellen
   - Den Erasmus+ Prioritäten

#### Was ist ein SMART-Ziel?

| Kriterium | Bedeutung | Beispiel |
|:----------|:----------|:---------|
| **S**pezifisch | Klar definiert | „Entwicklung eines Online-Kurses" |
| **M**essbar | Mit Indikatoren | „für 200 Teilnehmer" |
| **A**ttraktiv | Erreichbar | „innerhalb der Projektlaufzeit" |
| **R**elevant | Zielgruppenrelevant | „für Lehrkräfte im Bereich Digitalisierung" |
| **T**erminiert | Zeitgebunden | „bis Monat 18" |

#### Ziele bearbeiten

Für jedes generierte Ziel können Sie:

- Den **Zieltext** direkt im Feld bearbeiten
- **Indikatoren** anpassen oder ergänzen
- Die **Quellenbelege** einsehen (blaue Badges)
- Die zugehörige **Erasmus+ Priorität** sehen
- Einzelne Ziele **aus-/abwählen** per Checkbox
- Ein einzelnes Ziel **neu generieren** lassen

---

### Schritt 5: Work Package Struktur

Abhängig vom Aktionstyp wird hier entweder eine formale Work-Package-Struktur (KA220) oder eine Aktivitätenliste (KA210) erstellt.

#### Generierung starten

1. Klicken Sie auf **„WP-Struktur generieren"** (KA220) oder **„Projekt-Schritte generieren"** (KA210)
2. Optional: Geben Sie Prompt-Anweisungen ein
3. Die KI erstellt die Struktur basierend auf Konzept, Zielen und Partnern

#### KA220: Work Packages

Typische Struktur:

| WP | Titel | Beschreibung |
|:---|:------|:-------------|
| WP1 | Projektmanagement & QA | Verwaltung, Monitoring, Qualitätssicherung |
| WP2–N | Inhaltliche Arbeitspakete | Kernaktivitäten des Projekts |
| Letztes WP | Verbreitung & Nachhaltigkeit | Dissemination, Exploitation |

Jedes Work Package zeigt:

- **Titel** und **Beschreibung**
- **Zeitraum** (z.B. M1–M24) und **Lead-Partner**
- **Aktivitäten** (linke Spalte)
- **Deliverables** (rechte Spalte)

#### KA210: Aktivitätenliste

Für Kleinpartnerschaften werden stattdessen einfache Aktivitäten (A1, A2, A3...) mit Teilschritten und Ergebnissen erstellt.

---

### Schritt 6: Zusammenfassung & Export

Der letzte Schritt bietet einen Gesamtüberblick und die Möglichkeit zum Export.

#### Konzeptübersicht

Im oberen Bereich sehen Sie:

- **Konzepttitel** mit Akronym
- **Metadaten**: Aktionstyp, Sektor

#### Statistik-Übersicht

Vier farbige Kästchen zeigen auf einen Blick:

- Anzahl der **Quellen** (blau)
- Anzahl der **Partner** (lila)
- Anzahl der **Ziele** (grün)
- Anzahl der **Work Packages** (orange)

#### Detaillierter Konzeptentwurf

1. Klicken Sie auf **„Generiere Konzeptentwurf"** (ca. 30 Sekunden)
2. Die KI erstellt einen ausformulierten Entwurf mit allen Projektdetails
3. Das Ergebnis wird als formatierter Markdown-Text angezeigt

#### Verfügbare Aktionen

| Button | Funktion |
|:-------|:---------|
| **„Auf Englisch übersetzen"** | Übersetzt den Entwurf ins Englische |
| **„Als PDF speichern"** | Speichert den Entwurf als PDF-Datei |
| **„Mit neuen Anweisungen generieren"** | Erstellt den Entwurf mit anderen Vorgaben neu |
| **„Zur detaillierten Antrags-Entwicklung"** | Wechselt zum Projekt-Generator |

<div class="page-break"></div>

<a name="7-projekt-generator"></a>

## 7. Projekt-Generator — Die 12-Schritte-Pipeline

Der Projekt-Generator ist das Kernstück für die eigentliche Antragserstellung. Er überführt Ihr Konzept in die Struktur der offiziellen EU-Antragsformulare.

### Aufbau der Pipeline

Die Pipeline folgt der offiziellen Kapitelstruktur des Erasmus+ Antragsformulars:

| Kapitel | Thema | Inhalt |
|:--------|:------|:-------|
| 1 | **Kontext** | Projekttitel, Budget, Nationale Agentur, Sprache |
| 2 | **Beteiligte Organisationen** | Partnerbeschreibungen, Expertise, Rollen |
| 3 | **Relevanz des Projekts** | Problemanalyse, Bedarf, Innovation |
| 4 | **Arbeitspakete** | Aktivitäten, Deliverables, Budgets, Zeitpläne |
| 5 | **Ergebnisse & Qualitätssicherung** | Projektergebnisse, QA-Maßnahmen |
| 6 | **Budget-Begründung** | Kostenaufstellung und Rechtfertigung |
| 7 | **Verbreitung & Nutzung** | Dissemination, Exploitation |
| 8 | **Europäische Dimension** | Mehrwert der internationalen Zusammenarbeit |
| 9 | **Projektwirkung** | Impact, Indikatoren, Nachhaltigkeit |

### So funktioniert die Pipeline

#### Frage-basiertes Interface

Jeder Schritt enthält eine oder mehrere offizielle Fragen aus dem EU-Antragsformular. Für jede Frage:

1. **Lesen** Sie die Frage und den Kontext
2. **Generieren** Sie eine Antwort per KI-Button
3. **Überprüfen** und **bearbeiten** Sie die generierte Antwort
4. **Verbessern** Sie einzelne Abschnitte mit dem **„Improve with AI"**-Button
5. **Navigieren** Sie zum nächsten Schritt

#### KI-Kontextinformationen

Die KI berücksichtigt bei der Antwortgenerierung automatisch:

- Ihre Projektidee und das gewählte Konzept
- Die Partnerprofile und deren Expertise
- Die analysierten Recherchequellen
- Dokumente aus der Wissensdatenbank (RAG)
- Offizielle Erasmus+ Richtlinien
- Bereits beantwortete Fragen (Konsistenz)

#### Speichern & Fortsetzen

- Der Fortschritt wird **automatisch gespeichert**
- Sie können die Pipeline jederzeit **verlassen und später fortsetzen**
- Die Fortschrittsanzeige zeigt Ihren aktuellen Stand

### Projektspezifischer Wissenspool

Innerhalb des Generators können Sie zusätzliche Materialien anhängen:

- **Dokumente** — PDFs, Studien, Berichte
- **Websites** — URLs mit extrahiertem Inhalt
- **Notizen** — Post-it-artige Notizen mit Priorität und Frist

Diese Materialien fließen direkt in die KI-Generierung ein.

<div class="page-break"></div>

<a name="8-projekt-evaluator"></a>

## 8. Projekt-Evaluator

Der Evaluator bewertet Ihren fertigen Antrag nach den offiziellen EU-Vergabekriterien.

### Bewertungskategorien

| Kriterium | Maximalpunktzahl | Bewertungsaspekte |
|:----------|:----------------|:------------------|
| **Relevanz** | 30 Punkte | Passung zu Erasmus+ Prioritäten, Zielgruppenfokus, Bedarfsanalyse |
| **Qualität des Projektdesigns** | 20 Punkte | Methodik, WP-Struktur, Zeitpläne, Kohärenz |
| **Qualität der Partnerschaft** | 20 Punkte | Partnerprofile, Rollenverteilung, Kooperationsvereinbarungen |
| **Wirkung & Verbreitung** | 30 Punkte | KPIs, Multiplikatoren-Events, Nachhaltigkeit |
| **Gesamt** | **100 Punkte** | |

### Evaluierung durchführen

1. Öffnen Sie den Evaluator innerhalb des Projekt-Generators
2. Die KI analysiert alle beantworteten Fragen
3. Sie erhalten:
   - **Gesamtpunktzahl** (0–100)
   - **Aufschlüsselung** nach Kategorie
   - **Stärken** des Antrags
   - **Schwächen** und Verbesserungspotenziale
   - **Konkrete Verbesserungsvorschläge**

### Schwellenwert

| Ergebnis | Bedeutung | Empfehlung |
|:---------|:----------|:-----------|
| **≥ 60 Punkte** | Wettbewerbsfähig | Antrag zur Einreichung bereit |
| **< 60 Punkte** | Verbesserungsbedarf | Schwächen gezielt nacharbeiten |

> **Tipp:** Führen Sie die Evaluierung mehrfach durch — verbessern Sie nach jedem Durchgang die identifizierten Schwachstellen und lassen Sie erneut bewerten.

<div class="page-break"></div>

<a name="9-export"></a>

## 9. Export & Dokumentenerstellung

### Word-Dokument exportieren

1. Navigieren Sie zum **Export**-Bereich
2. Wählen Sie das Projekt, das Sie exportieren möchten
3. Klicken Sie auf **„Als Word exportieren"**
4. Das Tool generiert ein professionell formatiertes **.docx**-Dokument mit:
   - Allen Kapiteln und Abschnitten
   - Work-Package-Tabellen
   - Budgetübersichten
   - Partnerinformationen
   - Formatierung gemäß EU-Antragsstandards

### Konzeptentwurf als PDF

Im Schritt 6 des Konzeptentwicklers:

1. Generieren Sie den detaillierten Konzeptentwurf
2. Klicken Sie auf **„Als PDF speichern"**
3. Das Konzept wird als PDF-Datei heruntergeladen

<div class="page-break"></div>

<a name="10-ki-chat"></a>

## 10. KI-Chat-Assistent

### Funktionsweise

Der KI-Chat-Assistent ist ein RAG-gestütztes Frage-Antwort-System, das speziell für Erasmus+ Fragen trainiert ist.

### Zugang

Navigieren Sie über das Menü zum **„Chat"**-Bereich.

### Nutzung

1. Stellen Sie eine Frage zum Erasmus+ Programm
2. Die KI durchsucht die hochgeladenen Dokumente in der Wissensdatenbank
3. Sie erhalten eine kontextbasierte Antwort mit **Quellenangaben**
4. Führen Sie Folge-Fragen im selben Gesprächsverlauf

### Beispielfragen

- „Welche horizontalen Prioritäten gibt es für KA220 in der Erwachsenenbildung?"
- „Was sind die Anforderungen an das Konsortium für KA210?"
- „Wie hoch ist das Pauschalbudget für Projektmanagement?"
- „Welche Verbreitungsmaßnahmen werden erwartet?"

> **Voraussetzung:** Für optimale Ergebnisse sollte mindestens der Erasmus+ Programme Guide in der Wissensdatenbank hochgeladen sein.

<div class="page-break"></div>

<a name="11-bibliothek"></a>

## 11. Bibliothek

Die Bibliothek dient zur Verwaltung gespeicherter Konzepte und wiederverwendbarer Textbausteine.

### 11.1 Gespeicherte Konzepte

Unter **Bibliothek → Konzepte** finden Sie alle gespeicherten Konzeptentwürfe.

Für jedes Konzept können Sie:

- **Details anzeigen** — Konzeptinhalt, Status, Erstellungsdatum
- **Fortsetzen** — Konzeptentwicklung an der gespeicherten Stelle wiederaufnehmen
- **Zum Generator wechseln** — Konzept in die 12-Schritte-Pipeline überführen
- **Löschen** — Nicht mehr benötigte Konzepte entfernen

### 11.2 Textbausteine (Snippets)

Unter **Bibliothek → Textbausteine** verwalten Sie wiederverwendbare Textblöcke.

- **Erstellen** — Neue Textbausteine mit Titel, Inhalt und Tags anlegen
- **Suchen** — Volltextsuche über alle Bausteine
- **Verwenden** — Textbausteine in Projekte einfügen
- **Bearbeiten** — Bestehende Bausteine aktualisieren

> **Anwendungsbeispiel:** Speichern Sie häufig verwendete Organisationsbeschreibungen, Methodikabschnitte oder Disseminationsstrategien als Textbausteine.

<div class="page-break"></div>

<a name="12-tipps"></a>

## 12. Tipps & Best Practices

### Vor dem Start

- Laden Sie den **aktuellen Erasmus+ Programme Guide** in die Wissensdatenbank — dies verbessert die Qualität aller KI-Generierungen erheblich
- Legen Sie Ihre **Partner zuerst an** — die KI kann so projektspezifische Partnerbeschreibungen und WP-Zuweisungen erstellen
- Nutzen Sie den **Smart Import** für Partner — er spart erheblich Zeit gegenüber manueller Eingabe

### Während der Konzeptentwicklung

- Nehmen Sie sich Zeit für **Schritt 1** — eine präzise Projektidee ist die Grundlage für alles Weitere
- Nutzen Sie die **Research-Prompts** für externe Recherche — gut fundierte Quellen führen zu besseren Konzepten
- Laden Sie **2–3 relevante Quellen** hoch — nicht zu viele, aber ausreichend für fundierte Konzepte
- **Lesen und bearbeiten** Sie alle KI-generierten Inhalte — die KI liefert Entwürfe, keine fertigen Texte

### Im Projekt-Generator

- Bearbeiten Sie **jede generierte Antwort** individuell
- Nutzen Sie den **„Improve with AI"**-Button für Feinschliff
- Fügen Sie **projektspezifische Dokumente** zum Wissenspool hinzu
- Überprüfen Sie die **Konsistenz** zwischen den Kapiteln

### Für die Evaluierung

- Führen Sie den Evaluator **mindestens zweimal** durch
- Arbeiten Sie die **Verbesserungsvorschläge** gezielt ab
- Achten Sie besonders auf die Kriterien **Relevanz** (30 Punkte) und **Wirkung** (30 Punkte) — diese haben das höchste Gewicht

### Allgemeine Tipps

- **Speichern** Sie Ihre Arbeit regelmäßig — die Auto-Speicherung ist aktiv, aber ein manuelles Speichern schadet nie
- Nutzen Sie die **Textbausteine-Bibliothek** für wiederkehrende Formulierungen
- Die KI generiert auf **Basis Ihrer Eingaben** — je besser Ihre Eingaben, desto besser die Ergebnisse

<div class="page-break"></div>

<a name="13-faq"></a>

## 13. Häufige Fragen (FAQ)

### Allgemein

**Muss ich mich registrieren?**
Nein. Erasmus+ Architect funktioniert ohne Registrierung. Alle Daten werden lokal in Ihrem Browser gespeichert. Optional können Sie die Cloud-Synchronisation über Supabase aktivieren.

**Ist das Tool kostenlos?**
Ja, die Kernfunktionen sind kostenlos zugänglich.

**In welchen Sprachen kann ich arbeiten?**
Die Benutzeroberfläche ist primär auf Deutsch. Projektinhalte können in jeder Sprache verfasst werden. Der Konzeptentwurf kann auf Englisch übersetzt werden.

**Werden meine Daten sicher gespeichert?**
Standardmäßig werden alle Daten lokal im Browser gespeichert (IndexedDB). Bei aktivierter Cloud-Synchronisation werden Daten verschlüsselt an Supabase übertragen.

### Zur KI-Generierung

**Welche KI wird verwendet?**
Erasmus+ Architect nutzt Google Gemini für die Textgenerierung und semantische Suche.

**Kann ich die KI-Ergebnisse direkt verwenden?**
Die KI liefert hochwertige Entwürfe, die aber immer von Ihnen überprüft und angepasst werden sollten. Behandeln Sie KI-Texte als Ausgangspunkt, nicht als Endergebnis.

**Was beeinflusst die Qualität der KI-Antworten?**
Die Qualität hängt ab von: der Detailtiefe Ihrer Projektidee, der Anzahl und Qualität der hochgeladenen Quellen, den Partnerinformationen und den Dokumenten in der Wissensdatenbank.

### Zur Antragserstellung

**Entspricht das Ergebnis dem offiziellen EU-Format?**
Ja, der Projekt-Generator folgt der offiziellen Kapitelstruktur des Erasmus+ Antragsformulars.

**Kann ich ein Projekt später fortsetzen?**
Ja. Sowohl der Konzeptentwickler als auch der Projekt-Generator speichern Ihren Fortschritt automatisch. Sie können jederzeit dort weitermachen, wo Sie aufgehört haben.

**Was bedeutet der Evaluator-Score?**
Der Score basiert auf den offiziellen EU-Vergabekriterien. Ein Score von 60+ Punkten deutet auf einen wettbewerbsfähigen Antrag hin, ist aber keine Garantie für eine Bewilligung.

<div class="page-break"></div>

<a name="14-technik"></a>

## 14. Technische Informationen

### Systemanforderungen

| Anforderung | Minimum |
|:------------|:--------|
| **Browser** | Chrome, Firefox, Safari oder Edge (aktuell) |
| **Internet** | Stabile Verbindung für KI-Funktionen |
| **Bildschirm** | Mindestens 1024 × 768 Pixel |

### Technologie-Stack

| Komponente | Technologie |
|:-----------|:------------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS |
| **State Management** | Zustand |
| **UI-Komponenten** | Radix UI |
| **KI-Engine** | Google Gemini (Textgenerierung + Embeddings) |
| **Datenbank** | Supabase PostgreSQL (optional) |
| **Lokaler Speicher** | IndexedDB |
| **Dokumentenexport** | docx (Word-Generierung) |
| **Dokumentenimport** | pdfjs-dist, mammoth |

### Datenspeicherung

```
┌──────────────────────────────────────────────┐
│               Datenspeicherung               │
├──────────────────────────────────────────────┤
│                                              │
│  ┌────────────┐      ┌─────────────────┐    │
│  │  Zustand   │─────▶│   IndexedDB     │    │
│  │  (Memory)  │      │   (Browser)     │    │
│  └────────────┘      └────────┬────────┘    │
│                               │              │
│                    ┌──────────▼────────┐     │
│                    │    Supabase       │     │
│                    │    (Cloud)        │     │
│                    │    [optional]     │     │
│                    └──────────────────┘     │
│                                              │
└──────────────────────────────────────────────┘
```

- **Primär**: Zustand Store (Arbeitsspeicher)
- **Sekundär**: IndexedDB (lokaler Browser-Speicher, persistiert über Sessions)
- **Optional**: Supabase PostgreSQL (Cloud-Synchronisation)

### Hosting & Deployment

Die Anwendung kann über **Vercel** (empfohlen) oder als **Docker-Container** selbst gehostet werden.

Benötigte Umgebungsvariablen:

- `GEMINI_API_KEY` — Google Gemini API-Schlüssel
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase-Projekt-URL *(optional)*
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase Anonymous Key *(optional)*

---

<div class="footer-note">

**Erasmus+ Architect** — KI-gestützter Projektassistent für EU Erasmus+ Anträge

Version 1.0 | Februar 2026

*Dieses Handbuch wurde mit Sorgfalt erstellt. Alle Angaben beziehen sich auf den Erasmus+ Programmzyklus 2021–2027.*

</div>
