/**
 * KNOWLEDGE LOADER - Auto-loads knowledge base files into RAG system
 * ===================================================================
 * Loads all markdown files from the knowledge/ folder into the vector store
 * for use by the AI pipeline.
 */

import { vectorStore } from './rag-system';

// Knowledge file definitions with their corresponding sections
// Knowledge file definitions with their corresponding sections
const getKnowledgeFileDefs = (actionType: 'KA220' | 'KA210') => {
    const baseDir = `/knowledge/${actionType.toLowerCase()}`;

    if (actionType === 'KA210') {
        return [
            { name: 'KA210 Context', path: `${baseDir}/context.md`, type: 'programme_guide' as const, chapters: [1] },
            { name: 'KA210 Summary', path: `${baseDir}/summary.md`, type: 'programme_guide' as const, chapters: [6] },
            { name: 'KA210 Organisations', path: `${baseDir}/organisations.md`, type: 'programme_guide' as const, chapters: [2] },
            { name: 'KA210 Relevance', path: `${baseDir}/relevance.md`, type: 'programme_guide' as const, chapters: [3] },
            { name: 'KA210 Activities', path: `${baseDir}/activities.md`, type: 'programme_guide' as const, chapters: [4] },
            { name: 'KA210 Impact', path: `${baseDir}/impact.md`, type: 'programme_guide' as const, chapters: [5] }
        ];
    }

    return [
        { name: 'KA220 Context', path: `${baseDir}/context.md`, type: 'programme_guide' as const, chapters: [1] },
        { name: 'KA220 Summary', path: `${baseDir}/summary.md`, type: 'programme_guide' as const, chapters: [7] },
        { name: 'KA220 Organisations', path: `${baseDir}/organisations.md`, type: 'programme_guide' as const, chapters: [2] },
        { name: 'KA220 Relevance', path: `${baseDir}/relevance.md`, type: 'programme_guide' as const, chapters: [3] },
        { name: 'KA220 Partnership', path: `${baseDir}/partnership.md`, type: 'programme_guide' as const, chapters: [4] },
        { name: 'KA220 Impact', path: `${baseDir}/impact.md`, type: 'programme_guide' as const, chapters: [5] },
        { name: 'KA220 WP1', path: `${baseDir}/wp1.md`, type: 'programme_guide' as const, chapters: [6] },
        { name: 'KA220 WP2+', path: `${baseDir}/wp2.md`, type: 'programme_guide' as const, chapters: [6] }
    ];
};

let loadedActionType: string | null = null;
let loadingPromise: Promise<void> | null = null;

/**
 * Load knowledge files for a specific action type into the RAG vector store
 */
export async function loadKnowledgeBase(
    actionType: 'KA220' | 'KA210' = 'KA220',
    onProgress?: (status: string, progress: number) => void
): Promise<{ success: boolean; loadedCount: number; errors: string[] }> {

    // Prevent double-loading for the same type
    if (loadedActionType === actionType) {
        console.log(`[KnowledgeLoader] Knowledge base for ${actionType} already loaded`);
        return { success: true, loadedCount: 0, errors: [] };
    }

    // If switching types, we might want to clear or reload
    // For now, let's just allow loading another one or reloading

    const files = getKnowledgeFileDefs(actionType);
    const errors: string[] = [];
    let loadedCount = 0;

    loadingPromise = (async () => {
        console.log(`[KnowledgeLoader] Starting knowledge base load for ${actionType}...`);
        onProgress?.(`Lade Wissensdatenbank für ${actionType}...`, 0);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const progress = Math.round(((i + 1) / files.length) * 100);

            try {
                onProgress?.(`Lade ${file.name}...`, progress);

                const response = await fetch(file.path);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const content = await response.text();

                if (content.length < 5) { // Small placeholder files are okay
                    console.warn(`[KnowledgeLoader] File ${file.name} is too short`);
                    continue;
                }

                await vectorStore.addDocument(
                    file.name,
                    content,
                    file.type
                );

                loadedCount++;
                console.log(`[KnowledgeLoader] Loaded: ${file.name} (${content.length} chars)`);

            } catch (error: any) {
                const errorMsg = `Failed to load ${file.name}: ${error.message}`;
                console.error(`[KnowledgeLoader] ${errorMsg}`);
                errors.push(errorMsg);
            }
        }

        loadedActionType = actionType;
        onProgress?.('Wissensdatenbank geladen!', 100);
        console.log(`[KnowledgeLoader] Complete. Loaded ${loadedCount}/${files.length} files.`);
    })();

    await loadingPromise;
    loadingPromise = null;

    return { success: errors.length === 0, loadedCount, errors };
}

/**
 * Check if knowledge base for a specific action type is loaded
 */
export function isKnowledgeBaseLoaded(actionType: string): boolean {
    return loadedActionType === actionType;
}

/**
 * Force reload the knowledge base
 */
export async function reloadKnowledgeBase(
    actionType: 'KA220' | 'KA210' = 'KA220',
    onProgress?: (status: string, progress: number) => void
): Promise<{ success: boolean; loadedCount: number; errors: string[] }> {
    loadedActionType = null;
    loadingPromise = null;

    // Clear existing knowledge documents
    const docs = vectorStore.getDocuments();
    const ka220Names = getKnowledgeFileDefs('KA220').map(f => f.name);
    const ka210Names = getKnowledgeFileDefs('KA210').map(f => f.name);

    for (const doc of docs) {
        if (ka220Names.includes(doc.name) || ka210Names.includes(doc.name)) {
            vectorStore.deleteDocument(doc.id);
        }
    }

    return loadKnowledgeBase(actionType, onProgress);
}

/**
 * Get list of knowledge files
 */
export function getKnowledgeFiles(actionType: 'KA220' | 'KA210' = 'KA220') {
    return getKnowledgeFileDefs(actionType);
}
