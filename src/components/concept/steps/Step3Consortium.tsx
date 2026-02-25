import React from 'react';
import {
    Users, AlertTriangle, CheckCircle2, X, Search, Check, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConceptStore } from '@/store/concept-store';
import { useAppStore } from '@/store/app-store';

export function Step3Consortium() {
    const store = useConceptStore();
    const partners = useAppStore(s => s.partners);

    // Find selected concept
    const selectedConcept = store.concepts.find(c => c.id === store.selectedConceptId);

    const togglePartnerSelection = (partnerId: string) => {
        const isSelected = store.selectedPartners.some(sp => sp.partnerId === partnerId);
        if (isSelected) {
            store.updateField('selectedPartners', store.selectedPartners.filter(sp => sp.partnerId !== partnerId));
        } else {
            store.updateField('selectedPartners', [...store.selectedPartners, { partnerId, role: 'PARTNER' }]);
        }
    };

    const setPartnerRole = (partnerId: string, role: 'COORDINATOR' | 'PARTNER') => {
        store.updateField('selectedPartners', store.selectedPartners.map(sp => {
            if (sp.partnerId === partnerId) {
                return { ...sp, role };
            }
            if (role === 'COORDINATOR' && sp.role === 'COORDINATOR') {
                return { ...sp, role: 'PARTNER' };
            }
            return sp;
        }));
    };

    const getFilteredPartners = () => {
        const query = store.partnerSearchQuery.toLowerCase().trim();
        if (!query) return partners;
        return partners.filter(p =>
            p.organizationName.toLowerCase().includes(query) ||
            p.country.toLowerCase().includes(query) ||
            p.organizationType.toLowerCase().includes(query) ||
            p.city?.toLowerCase().includes(query) ||
            p.expertiseAreas?.some(e => e.domain.toLowerCase().includes(query)) ||
            (p.tags && p.tags.some((t: string) => t.toLowerCase().includes(query)))
        );
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <Users className="h-5 w-5 text-purple-500" />
                    Schritt 3: Konsortium zusammenstellen
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                    Wähle Partner aus deinem Partnerpool für das Konzept "{selectedConcept?.title || 'Unbekannt'}" aus.
                </p>
                <div className={`text-xs rounded-lg px-3 py-2 mb-2 ${store.actionType === 'KA210'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    }`}>
                {store.actionType === 'KA210'
                    ? '📋 KA210: Mindestens 2 Partner aus 2 verschiedenen Ländern'
                    : '📋 KA220: Mindestens 3 Partner aus 3 verschiedenen Ländern'}
            </div>
        </div>

            {
        partners.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
                <h3 className="font-bold text-amber-900 mb-2">Keine Partner vorhanden</h3>
                <p className="text-sm text-amber-700 mb-4">
                    Du hast noch keine Partner in deiner Datenbank. Füge zuerst Partner hinzu, um ein Konsortium zusammenzustellen.
                </p>
                <Button
                    variant="outline"
                    onClick={() => window.location.href = '/partners'}
                    className="border-amber-300 text-amber-700 hover:bg-amber-100"
                >
                    <Users className="h-4 w-4 mr-2" />
                    Zur Partnerverwaltung
                </Button>
            </div>
        ) : (
        <>
            {/* Selected Partners */}
            {store.selectedPartners.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Ausgewählte Partner ({store.selectedPartners.length})
                    </h3>
                    <div className="space-y-2">
                        {store.selectedPartners.map(sp => {
                            const partner = partners.find(p => p.id === sp.partnerId);
                            if (!partner) return null;
                            return (
                                        <div key={sp.partnerId} className="flex items-center gap-3 bg-white rounded-lg border border-purple-200 px-3 py-2">
                                            <div className="flex-1 min-w-0">
                                                <span className="font-semibold text-gray-900 text-sm truncate block">{partner.organizationName}</span>
                                                <span className="text-xs text-gray-500">{partner.country}{partner.city ? `, ${partner.city}` : ''}</span>
                                            </div>
                                            <select
                                                value={sp.role}
                                                onChange={e => setPartnerRole(sp.partnerId, e.target.value as 'COORDINATOR' | 'PARTNER')}
                                                className={`text-xs font-bold rounded-full px-3 py-1 border-0 cursor-pointer ${sp.role === 'COORDINATOR'
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : 'bg-gray-100 text-gray-700'
                                                    }`}
                                            >
                                                <option value="PARTNER">Partner</option>
                                                <option value="COORDINATOR">Koordinator</option>
                                            </select>
                                            <button
                                                onClick={() => togglePartnerSelection(sp.partnerId)}
                                                className="text-red-400 hover:text-red-600 p-1"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                    );
                                })}
                </div>
                        </div >
                    )
    }

    {/* Search */ }
    <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
            value={store.partnerSearchQuery}
            onChange={e => store.updateState({ partnerSearchQuery: e.target.value })}
            placeholder="Partner suchen (Name, Land, Typ, Expertise...)"
            className="pl-10"
        />
    </div>

    {/* Partner List */ }
    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {getFilteredPartners().map(partner => {
            const isSelected = store.selectedPartners.some(sp => sp.partnerId === partner.id);
            return (
                <div
                    key={partner.id}
                    onClick={() => togglePartnerSelection(partner.id)}
                    className={`rounded-xl border p-4 cursor-pointer transition-all ${isSelected
                        ? 'border-purple-400 bg-purple-50 shadow-sm'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                                        }`}
                                >
        <div className="flex items-start gap-3">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                                            }`}>
            {isSelected && <Check className="h-3 w-3 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
                <h4 className="font-semibold text-gray-900 text-sm truncate">{partner.organizationName}</h4>
                <span className="text-xs text-gray-500 flex items-center gap-1 shrink-0">
                    <Globe className="h-3 w-3" />
                    {partner.country}{partner.city ?`, ${partner.city}` : ''}
                </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {partner.organizationType?.replace(/_/g, ' ') || 'Unknown'}
                </span>
                {partner.expertiseAreas?.slice(0, 3).map((e: any, j: number) => (
                    <span key={j} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">
                        {e.domain?.replace(/_/g, ' ') || 'Unknown'}
                    </span>
                ))}
                {(partner.expertiseAreas?.length || 0) > 3 && (
                    <span className="text-xs text-gray-400">+{(partner.expertiseAreas?.length || 0) - 3}</span>
                )}
            </div>
        </div>
    </div>
                                </div >
                            );
})}

{
    getFilteredPartners().length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">
            Keine Partner gefunden für "{store.partnerSearchQuery}"
        </div>
    )
}
                    </div >
                </>
            )}
        </div >
    );
}
