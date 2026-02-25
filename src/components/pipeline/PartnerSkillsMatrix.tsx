import React, { useMemo } from 'react';
import { ConsortiumPartner } from '@/lib/project-pipeline';
import { Check, X, Award } from 'lucide-react';

interface PartnerSkillsMatrixProps {
    partners: ConsortiumPartner[];
    language?: string;
}

export function PartnerSkillsMatrix({ partners, language = 'de' }: PartnerSkillsMatrixProps) {
    const t = {
        title: language === 'de' ? 'Partner-Kompetenz-Matrix' : 'Partner Skills Matrix',
        subtitle: language === 'de'
            ? 'Übersicht der sich ergänzenden Expertise-Bereiche im Konsortium.'
            : 'Overview of complementing expertise areas within the consortium.',
        noPartners: language === 'de' ? 'Noch keine Partner vorhanden.' : 'No partners selected yet.',
        noExpertise: language === 'de' ? 'Keine spezifische Expertise angegeben' : 'No specific expertise provided'
    };

    // Extract all unique expertise domains across the consortium
    const allExpertiseDomains = useMemo(() => {
        const domains = new Set<string>();
        partners.forEach(partner => {
            if (partner.expertise && Array.isArray(partner.expertise)) {
                partner.expertise.forEach(exp => {
                    if (typeof exp === 'string' && exp.trim()) {
                        domains.add(exp.trim());
                    }
                });
            }
        });

        return Array.from(domains).sort((a, b) => a.localeCompare(b));
    }, [partners]);

    if (!partners || partners.length === 0) {
        return (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-center text-sm">
                {t.noPartners}
            </div>
        );
    }

    if (allExpertiseDomains.length === 0) {
        return (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-center text-sm">
                {t.noExpertise}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
                <Award className="h-5 w-5 text-indigo-600" />
                <div>
                    <h4 className="font-semibold text-slate-800">{t.title}</h4>
                    <p className="text-xs text-slate-500">{t.subtitle}</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-[#003399]/5 border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 font-semibold text-slate-700 min-w-[200px]">
                                {language === 'de' ? 'Expertise-Bereich' : 'Expertise Domain'}
                            </th>
                            {partners.map((partner, index) => (
                                <th key={partner.id || index} className="px-4 py-3 text-center min-w-[120px] max-w-[150px]">
                                    <div className="flex flex-col items-center">
                                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#003399] text-white text-xs font-bold mb-1 shrink-0">
                                            P{index + 1}
                                        </span>
                                        <span className="font-medium text-slate-800 truncate w-full" title={partner.name}>
                                            {partner.name}
                                        </span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {allExpertiseDomains.map((domain, rowIndex) => (
                            <tr key={rowIndex} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 font-medium text-slate-700">
                                    {domain}
                                </td>
                                {partners.map((partner, colIndex) => {
                                    const hasExpertise = partner.expertise?.some(
                                        e => typeof e === 'string' && e.trim().toLowerCase() === domain.toLowerCase()
                                    );

                                    return (
                                        <td key={colIndex} className="px-4 py-3 text-center">
                                            {hasExpertise ? (
                                                <div className="flex justify-center">
                                                    <div className="bg-emerald-100 text-emerald-700 w-6 h-6 rounded-full flex items-center justify-center">
                                                        <Check className="h-4 w-4" strokeWidth={3} />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex justify-center">
                                                    <div className="text-slate-300">
                                                        <X className="h-4 w-4" strokeWidth={2} />
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 italic">
                {language === 'de'
                    ? 'Diese Matrix demonstriert, dass das Konsortium alle notwendigen Kompetenzen für die Projektumsetzung abdeckt, ohne Redundanzen aufzuweisen.'
                    : 'This matrix demonstrates that the consortium covers all necessary competencies for project implementation without showing redundancies.'}
            </div>
        </div>
    );
}
