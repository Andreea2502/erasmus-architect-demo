import { useState } from 'react';
import { useConceptStore } from '@/store/concept-store';
import { generateContentAction } from '@/app/actions/gemini';
import { getGenerateWorkPackagesPrompt } from '@/lib/concept-prompts';
import { WPSuggestion } from '@/types/concept';
import { useAppStore } from '@/store/app-store';

export function useWorkPackageGeneration() {
    const store = useConceptStore();
    const partners = useAppStore(s => s.partners);
    const [isGenerating, setIsGenerating] = useState(false);

    const generateWPStructure = async () => {
        setIsGenerating(true);
        try {
            const selectedConcept = store.concepts.find(c => c.id === store.selectedConceptId);
            if (!selectedConcept) {
                setIsGenerating(false);
                store.updateState({ wpError: 'Bitte wähle zuerst ein Konzept in Schritt 2 aus.' });
                return;
            }

            const consortiumText = store.selectedPartners.map(sp => {
                const p = partners.find(pp => pp.id === sp.partnerId);
                return p ?`- ${sp.role}: ${p.organizationName} (${p.country}, ${p.organizationType.replace(/_/g, ' ')})` : '';
      }).filter(Boolean).join('\n');

      const prompt = getGenerateWorkPackagesPrompt(store, consortiumText, selectedConcept);

      const response = await generateContentAction(prompt, 'Du bist WP-Experte. Antworte NUR im JSON-Format.', 0.7, 45000);
      const clean = response.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(clean);

            const workPackages = parsed.workPackages || [];
            store.updateState({
                wpSuggestions: workPackages,
                selectedWpNumbers: workPackages.map((wp: WPSuggestion) => wp.number),
                wpGenerated: true,
                wpError: undefined
            });
        } catch (e: any) {
            console.error('WP generation error:', e);
            store.updateState({
                wpError: e?.message || 'WP-Struktur konnte nicht generiert werden. Bitte erneut versuchen.',
                wpGenerated: false,
            });
        }
        setIsGenerating(false);
    };

    return {
        isGenerating,
        generateWPStructure
    };
}
