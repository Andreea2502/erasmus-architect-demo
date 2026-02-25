/**
 * RAG SYSTEM - Retrieval Augmented Generation
 * ============================================
 * Ermöglicht das Hochladen von Dokumenten (PDFs, Studien, Programmleitfaden)
 * und intelligentes Retrieval für kontextbezogene KI-Antworten
 */

import { v4 as uuidv4 } from 'uuid';
// @ts-ignore
import { getEmbeddingAction, extractTextFromImageAction, generateContentAction } from '@/app/actions/gemini';
// TYPES
// ============================================================================

import { set, get, del as delKey } from 'idb-keyval';
// ============================================================================

export interface DocumentChunk {
  id: string;
  documentId: string;
  documentName: string;
  documentType: 'programme_guide' | 'study' | 'statistics' | 'other';
  content: string;
  pageNumber?: number;
  chunkIndex: number;
  embedding?: number[];
  metadata?: Record<string, unknown>;
}

export interface UploadedDocument {
  id: string;
  name: string;
  type: 'programme_guide' | 'study' | 'statistics' | 'other';
  uploadedAt: Date;
  totalChunks: number;
  totalPages?: number;
  summary?: string;
  keyTopics?: string[];
}

export interface RAGQuery {
  query: string;
  documentTypes?: ('programme_guide' | 'study' | 'statistics' | 'other')[];
  maxChunks?: number;
  minRelevance?: number;
}

export interface RAGResult {
  chunks: DocumentChunk[];
  context: string;
  sources: { documentName: string; pageNumber?: number }[];
}

// ============================================================================
// VECTOR STORE (In-Memory mit Cosine Similarity)
// ============================================================================

class VectorStore {
  private chunks: DocumentChunk[] = [];
  private documents: UploadedDocument[] = [];
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Start loading immediately but don't block
    if (typeof window !== 'undefined') {
      this.initPromise = this.load();
    }
  }

  // Initialisierung sicherstellen
  private async ensureInitialized() {
    if (this.initialized) return;
    if (!this.initPromise) {
      this.initPromise = this.load();
    }
    await this.initPromise;
  }

  // Laden aus IndexedDB
  private async load() {
    try {
      const docs = await get('rag-documents');
      const chunks = await get('rag-chunks');
      if (docs) this.documents = docs;
      if (chunks) this.chunks = chunks;
      this.initialized = true;
      console.log(`[VectorStore] Loaded ${this.documents.length} docs, ${this.chunks.length} chunks`);
    } catch (e) {
      console.error('[VectorStore] Failed to load:', e);
      this.initialized = true; // Proceed empty on error
    }
  }

  // Speichern in IndexedDB
  private async persist() {
    try {
      await set('rag-documents', this.documents);
      await set('rag-chunks', this.chunks);
      console.log('[VectorStore] Persisted to IndexedDB');
    } catch (e) {
      console.error('[VectorStore] Failed to persist:', e);
    }
  }

  // Gemini API für Embeddings (Server Action)
  private async getEmbedding(text: string): Promise<number[]> {
    try {
      return await getEmbeddingAction(text);
    } catch (error) {
      console.error('Embedding error:', error);
      return [];
    }
  }

  // Cosine Similarity berechnen
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  // Configuration for large document handling
  private readonly MAX_CHUNKS_FOR_EMBEDDING = 200; // Limit embeddings for very large docs
  private readonly BATCH_SIZE = 10; // Process embeddings in batches
  private readonly BATCH_DELAY = 500; // Delay between batches (ms)

  // Dokument hinzufügen - mit Unterstützung für große Dateien
  async addDocument(
    name: string,
    content: string,
    type: UploadedDocument['type'],
    pageNumbers?: number[],
    summary?: string,
    onProgress?: (progress: number, status: string) => void
  ): Promise<UploadedDocument> {
    await this.ensureInitialized();
    const documentId = uuidv4();

    // Für sehr große Dokumente (>500 Seiten): Intelligentes Sampling
    const isLargeDocument = (pageNumbers?.length || 0) > 100 || content.length > 500000;

    let processedContent = content;
    if (isLargeDocument) {
      onProgress?.(5, 'Großes Dokument erkannt - optimiere Verarbeitung...');
      processedContent = this.sampleLargeDocument(content, pageNumbers);
    }

    // Text in Chunks aufteilen (ca. 1000 Zeichen mit Überlappung)
    const chunks = this.splitIntoChunks(processedContent, 1000, 200);
    const totalChunks = chunks.length;

    onProgress?.(10, `${totalChunks} Textabschnitte erstellt...`);

    // Limit chunks für Embedding bei sehr großen Dokumenten
    const chunksForEmbedding = isLargeDocument && chunks.length > this.MAX_CHUNKS_FOR_EMBEDDING
      ? this.selectRepresentativeChunks(chunks, this.MAX_CHUNKS_FOR_EMBEDDING)
      : chunks;

    // Embeddings für jeden Chunk erstellen - in Batches für bessere Performance
    const documentChunks: DocumentChunk[] = [];
    let processedCount = 0;

    // Batch processing für bessere Rate-Limiting Handhabung
    for (let batchStart = 0; batchStart < chunksForEmbedding.length; batchStart += this.BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + this.BATCH_SIZE, chunksForEmbedding.length);
      const batch = chunksForEmbedding.slice(batchStart, batchEnd);

      // Process batch in parallel
      const batchPromises = batch.map(async (chunk, batchIndex) => {
        const originalIndex = batchStart + batchIndex;
        try {
          const embedding = await this.getEmbedding(chunk);
          return {
            id: uuidv4(),
            documentId,
            documentName: name,
            documentType: type,
            content: chunk,
            pageNumber: this.calculatePageNumber(originalIndex, chunks.length, pageNumbers),
            chunkIndex: originalIndex,
            embedding,
          } as DocumentChunk;
        } catch (error) {
          console.error(`Embedding error for chunk ${originalIndex}:`, error);
          // Chunk ohne Embedding hinzufügen (wird bei Keyword-Suche gefunden)
          return {
            id: uuidv4(),
            documentId,
            documentName: name,
            documentType: type,
            content: chunk,
            pageNumber: this.calculatePageNumber(originalIndex, chunks.length, pageNumbers),
            chunkIndex: originalIndex,
          } as DocumentChunk;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      documentChunks.push(...batchResults);

      processedCount += batch.length;
      const progress = 10 + Math.floor((processedCount / chunksForEmbedding.length) * 80);
      onProgress?.(progress, `Verarbeite Chunk ${processedCount}/${chunksForEmbedding.length}...`);

      // Delay zwischen Batches um Rate-Limiting zu vermeiden
      if (batchEnd < chunksForEmbedding.length) {
        await new Promise(resolve => setTimeout(resolve, this.BATCH_DELAY));
      }
    }

    // Für große Dokumente: Füge auch Chunks ohne Embedding hinzu (für Keyword-Suche)
    if (isLargeDocument && chunks.length > this.MAX_CHUNKS_FOR_EMBEDDING) {
      const embeddedChunkIndices = new Set(documentChunks.map(c => c.chunkIndex));
      const additionalChunks = chunks
        .map((chunk, index) => {
          if (embeddedChunkIndices.has(index)) return null;
          return {
            id: uuidv4(),
            documentId,
            documentName: name,
            documentType: type,
            content: chunk,
            pageNumber: this.calculatePageNumber(index, chunks.length, pageNumbers),
            chunkIndex: index,
            // Kein Embedding - wird nur für Keyword-Suche verwendet
          } as DocumentChunk;
        })
        .filter((c): c is DocumentChunk => c !== null);

      documentChunks.push(...additionalChunks);
      onProgress?.(95, `${additionalChunks.length} zusätzliche Chunks für Keyword-Suche hinzugefügt...`);
    }

    this.chunks.push(...documentChunks);

    const document: UploadedDocument = {
      id: documentId,
      name,
      type,
      uploadedAt: new Date(),
      totalChunks: documentChunks.length,
      totalPages: pageNumbers?.length,
      summary,
      keyTopics: isLargeDocument ? ['Großes Dokument', `${pageNumbers?.length || 'n/a'} Seiten`] : undefined,
    };

    this.documents.push(document);

    await this.persist();
    onProgress?.(100, 'Fertig!');

    return document;
  }

  // Hilfsfunktion: Seitennummer berechnen
  private calculatePageNumber(chunkIndex: number, totalChunks: number, pageNumbers?: number[]): number | undefined {
    if (!pageNumbers?.length) return undefined;
    const ratio = chunkIndex / totalChunks;
    const pageIndex = Math.floor(ratio * pageNumbers.length);
    return pageNumbers[pageIndex];
  }

  // Intelligentes Sampling für große Dokumente
  private sampleLargeDocument(content: string, pageNumbers?: number[]): string {
    // Bei sehr großen Dokumenten: Nimm Intro, Conclusion und gleichmäßig verteilte Abschnitte
    const lines = content.split('\n');
    const totalLines = lines.length;

    if (totalLines < 2000) return content;

    const sampledLines: string[] = [];

    // Erste 10% (Einleitung)
    const introEnd = Math.floor(totalLines * 0.1);
    sampledLines.push(...lines.slice(0, introEnd));

    // Mittlere Abschnitte (gleichmäßig verteilt, ~40% des Inhalts)
    const middleStart = introEnd;
    const middleEnd = Math.floor(totalLines * 0.9);
    const middleStep = Math.floor((middleEnd - middleStart) / (totalLines * 0.4 / 100));

    for (let i = middleStart; i < middleEnd; i += middleStep) {
      const sampleEnd = Math.min(i + 50, middleEnd); // Nimm 50 Zeilen pro Sample
      sampledLines.push(...lines.slice(i, sampleEnd));
    }

    // Letzte 10% (Schlussfolgerungen)
    sampledLines.push(...lines.slice(Math.floor(totalLines * 0.9)));

    console.log(`[VectorStore] Large doc sampling: ${totalLines} -> ${sampledLines.length} lines`);
    return sampledLines.join('\n');
  }

  // Repräsentative Chunks auswählen für Embedding
  private selectRepresentativeChunks(chunks: string[], maxChunks: number): string[] {
    if (chunks.length <= maxChunks) return chunks;

    const selected: string[] = [];
    const step = chunks.length / maxChunks;

    for (let i = 0; i < maxChunks; i++) {
      const index = Math.floor(i * step);
      selected.push(chunks[index]);
    }

    return selected;
  }

  // Text in überlappende Chunks aufteilen
  private splitIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/(?<=[.!?])\s+/);

    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        // Überlappung: letzte Sätze behalten
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(overlap / 5));
        currentChunk = overlapWords.join(' ') + ' ' + sentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  // Relevante Chunks suchen
  async search(query: RAGQuery): Promise<RAGResult> {
    await this.ensureInitialized();
    const maxChunks = query.maxChunks || 10;
    const minRelevance = query.minRelevance || 0.3;

    // Query Embedding erstellen
    let queryEmbedding: number[] | null = null;
    try {
      queryEmbedding = await this.getEmbedding(query.query);
    } catch (error) {
      console.error('Query embedding error:', error);
    }

    // Chunks filtern nach Dokumenttyp
    let filteredChunks = this.chunks;
    if (query.documentTypes && query.documentTypes.length > 0) {
      filteredChunks = this.chunks.filter(c =>
        query.documentTypes!.includes(c.documentType)
      );
    }

    // Relevanz berechnen
    const scoredChunks = filteredChunks.map(chunk => {
      let score = 0;

      // Embedding-basierte Similarity
      if (queryEmbedding && chunk.embedding) {
        score = this.cosineSimilarity(queryEmbedding, chunk.embedding);
      }

      // Keyword-basierte Relevanz als Fallback/Boost
      const keywords = query.query.toLowerCase().split(/\s+/);
      const contentLower = chunk.content.toLowerCase();
      const keywordMatches = keywords.filter(kw => contentLower.includes(kw)).length;
      const keywordScore = keywordMatches / keywords.length;

      // Kombinierter Score
      score = Math.max(score, keywordScore * 0.8);
      if (queryEmbedding && chunk.embedding) {
        score = score * 0.7 + keywordScore * 0.3;
      }

      return { chunk, score };
    });

    // Sortieren und filtern
    const relevantChunks = scoredChunks
      .filter(sc => sc.score >= minRelevance)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxChunks)
      .map(sc => sc.chunk);

    // Kontext zusammenbauen
    const context = relevantChunks
      .map(c => `[${c.documentName}${c.pageNumber ? `, S.${c.pageNumber}` : ''}]\n${c.content}`)
      .join('\n\n---\n\n');

    // Quellen sammeln
    const sourcesMap = new Map<string, { documentName: string; pageNumber?: number }>();
    for (const chunk of relevantChunks) {
      const key = `${chunk.documentName}-${chunk.pageNumber || 'n/a'}`;
      if (!sourcesMap.has(key)) {
        sourcesMap.set(key, { documentName: chunk.documentName, pageNumber: chunk.pageNumber });
      }
    }

    return {
      chunks: relevantChunks,
      context,
      sources: Array.from(sourcesMap.values()),
    };
  }

  // Convenience method for easier calling
  async queryRag(query: string, maxChunks: number = 3, minRelevance: number = 0.5, documentTypes: ('programme_guide' | 'study' | 'statistics' | 'other')[] = []): Promise<RAGResult> {
    return this.search({
      query,
      maxChunks,
      minRelevance,
      documentTypes
    });
  }

  // Alle Dokumente abrufen
  // Note: Since this is synchronous in interface but needs async load, 
  // we might return empty if not loaded yet. Best to call ensureInitialized before rendering UI.
  // Updated to async to be safe.
  async getDocumentsAsync(): Promise<UploadedDocument[]> {
    await this.ensureInitialized();
    return [...this.documents];
  }

  // Legacy sync method (might be empty if not loaded)
  getDocuments(): UploadedDocument[] {
    return [...this.documents];
  }

  // Dokument löschen
  async deleteDocument(documentId: string): Promise<boolean> {
    await this.ensureInitialized();
    const docIndex = this.documents.findIndex(d => d.id === documentId);
    if (docIndex === -1) return false;

    this.documents.splice(docIndex, 1);
    this.chunks = this.chunks.filter(c => c.documentId !== documentId);

    await this.persist();
    return true;
  }

  // Store leeren
  async clear(): Promise<void> {
    this.chunks = [];
    this.documents = [];
    await delKey('rag-documents');
    await delKey('rag-chunks');
  }

  // Export für Persistenz
  export(): { documents: UploadedDocument[]; chunks: DocumentChunk[] } {
    return {
      documents: this.documents,
      chunks: this.chunks,
    };
  }

  // Import für Persistenz
  import(data: { documents: UploadedDocument[]; chunks: DocumentChunk[] }): void {
    this.documents = data.documents || [];
    this.chunks = data.chunks || [];
  }
}

// Singleton Instance
export const vectorStore = new VectorStore();

// ============================================================================
// PDF PARSING
// ============================================================================

export async function extractTextFromPDF(file: File): Promise<{ text: string; pageTexts: string[] }> {
  const pdfjsLib = await import('pdfjs-dist');

  // Worker konfigurieren - lokale Version statt CDN
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageTexts: string[] = [];
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: unknown) => (item as { str: string }).str)
      .join(' ');

    pageTexts.push(pageText);
    fullText += pageText + '\n\n';
  }

  return { text: fullText, pageTexts };
}

// ============================================================================
// DOCX PARSING
// ============================================================================

export async function extractTextFromDocx(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

// ============================================================================
// IMAGE TEXT EXTRACTION (via Gemini Vision Server Action)
// ============================================================================

export async function extractTextFromImage(imageBase64: string): Promise<string> {
  try {
    return await extractTextFromImageAction(imageBase64);
  } catch (error) {
    console.error('Image text extraction error:', error);
    return '';
  }
}

// ============================================================================
// DOCUMENT UPLOAD HANDLER
// ============================================================================

export async function uploadDocument(
  file: File,
  type: UploadedDocument['type'],
  onProgress?: (progress: number, status: string) => void
): Promise<UploadedDocument> {
  onProgress?.(10, 'Datei wird gelesen...');

  let text = '';
  let pageNumbers: number[] | undefined;

  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    // PDF verarbeiten
    onProgress?.(20, 'PDF wird analysiert...');
    const { text: pdfText, pageTexts } = await extractTextFromPDF(file);
    text = pdfText;
    pageNumbers = pageTexts.map((_, i) => i + 1);
    onProgress?.(50, `${pageTexts.length} Seiten extrahiert...`);

  } else if (fileType.startsWith('image/')) {
    // Bild verarbeiten
    onProgress?.(20, 'Bild wird analysiert...');
    const base64 = await fileToBase64(file);
    text = await extractTextFromImage(base64);
    onProgress?.(50, 'Text aus Bild extrahiert...');

  } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
    // Textdatei
    text = await file.text();
    onProgress?.(50, 'Textdatei gelesen...');

  } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
    // Word-Datei
    onProgress?.(20, 'Word-Datei wird analysiert...');
    text = await extractTextFromDocx(file);
    onProgress?.(50, 'Text aus Word extrahiert...');

  } else if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
    // CSV
    text = await file.text();
    onProgress?.(50, 'CSV-Datei gelesen...');

  } else {
    throw new Error(`Nicht unterstützter Dateityp: ${fileType}`);
  }

  // ZUSAMMENFASSUNG GENERIEREN
  // ==========================
  onProgress?.(60, 'Generiere Zusammenfassung...');
  let summary = '';
  try {
    const summaryPrompt = `Fasse dieses Dokument in max. 2 Sätzen zusammen. Fokus auf Hauptinhalte für Erasmus+ Projekte.
     
     Text:
     ${text.substring(0, 8000)}`; // Limit context

    summary = await generateContentAction(summaryPrompt, "Du bist eine hilfreiche KI für Dokumentenanalyse.");
  } catch (e) {
    console.warn("Summary generation failed", e);
    // Proceed without summary
  }

  onProgress?.(80, 'Erstelle Embeddings...');

  // Zum Vector Store hinzufügen
  const document = await vectorStore.addDocument(
    file.name,
    text,
    type,
    pageNumbers,
    summary
  );

  onProgress?.(100, 'Dokument indexiert!');

  return document;
}

// Hilfsfunktion: File zu Base64
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// RAG-ENHANCED AI QUERY
// ============================================================================

export async function queryWithRAG(
  userQuery: string,
  options: {
    includeGuide?: boolean;
    includeStudies?: boolean;
    language?: string;
  } = {}
): Promise<{ answer: string; sources: RAGResult['sources'] }> {
  const documentTypes: RAGQuery['documentTypes'] = [];

  if (options.includeGuide !== false) {
    documentTypes.push('programme_guide');
  }
  if (options.includeStudies !== false) {
    documentTypes.push('study', 'statistics');
  }

  // Relevante Chunks finden
  const ragResult = await vectorStore.search({
    query: userQuery,
    documentTypes: documentTypes.length > 0 ? documentTypes : undefined,
    maxChunks: 8,
    minRelevance: 0.25,
  });

  // Wenn keine Dokumente gefunden, normalen AI Call machen
  if (ragResult.chunks.length === 0) {
    // Verwende callGemini als Fallback, sollte aber idealerweise auch Server Action nutzen,
    // aber callGemini ist hier via Import referenziert und vielleicht noch nicht angepasst? 
    // NEIN: callGemini ist in ui components used. Here we can use generateContentAction directly.
    // Aber callGemini könnte spezifische Logik haben. 
    // Import von ./ai-service könnte "client side only" sein, wenn ai-service nicht sicher ist.
    // Aber ai-service.ts ist aktuell der Active Document, und es schien auch NEXT_PUBLIC Key zu nutzen.
    // However, I will use server action here directly for consistency.

    try {
      const answer = await generateContentAction(userQuery);
      return { answer, sources: [] };
    } catch (e) {
      // Fallback to imported callGemini if needed, but safer to stick to server action
      return { answer: "Entschuldigung, ich konnte keine Antwort generieren.", sources: [] };
    }
  }

  // AI mit RAG-Kontext aufrufen (Server Action)
  const systemPrompt = `Du bist ein Erasmus+ Experte. Beantworte die Frage basierend auf den folgenden Dokumenten.
${options.language === 'de' ? 'Antworte auf Deutsch.' : ''}

WICHTIG:
- Nutze NUR Informationen aus den bereitgestellten Dokumenten
- Zitiere relevante Passagen mit [Quelle: Dokumentname, Seite X]
- Wenn die Dokumente keine Antwort enthalten, sage das klar

DOKUMENTE:
${ragResult.context}`;

  try {
    const answer = await generateContentAction(
      userQuery,
      systemPrompt,
      0.3
    );
    return { answer, sources: ragResult.sources };
  } catch (error) {
    console.error('RAG Query Error:', error);
    return { answer: 'Fehler bei der Antwortgenerierung.', sources: [] };
  }
}
