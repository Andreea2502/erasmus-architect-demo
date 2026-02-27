"use client";

import React, { useState } from 'react';
import { Plus, Trash2, Users, Layers, Sparkles, ArrowRight, Import, FileUp, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBudgetCalculatorStore } from '@/store/budget-calculator-store';
import { useAppStore } from '@/store/app-store';
import { BUDGET_TIERS } from '@/store/types';
import { getCountryProfile, COST_GROUP_META } from '@/lib/country-cost-profiles';

interface BudgetSetupProps {
    onImportClick?: () => void;
    onStartWithDistribution?: () => void;
}

export function BudgetSetup({ onImportClick, onStartWithDistribution }: BudgetSetupProps) {
    const store = useBudgetCalculatorStore();
    const appPartners = useAppStore(s => s.partners);
    const projects = useAppStore(s => s.projects);

    const [newPartnerName, setNewPartnerName] = useState('');
    const [newPartnerCountry, setNewPartnerCountry] = useState('');
    const [newWPTitle, setNewWPTitle] = useState('');
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [selectedImportIds, setSelectedImportIds] = useState<string[]>([]);

    const tiers = BUDGET_TIERS[store.actionType] || [250000];
    const canStart = store.partners.length >= 2 && store.workPackages.length >= 1;
    const hasImportableProjects = projects.some(p => p.generatorState?.consortium?.length > 0 || p.generatorState?.workPackages?.length > 0);

    const handleAddPartner = () => {
        if (!newPartnerName.trim() || !newPartnerCountry.trim()) return;
        store.addPartner(newPartnerName.trim(), newPartnerCountry.trim().toUpperCase());
        setNewPartnerName('');
        setNewPartnerCountry('');
    };

    const handleAddWP = () => {
        if (!newWPTitle.trim()) return;
        store.addWorkPackage(newWPTitle.trim());
        setNewWPTitle('');
    };

    const handleImport = () => {
        const toImport = appPartners
            .filter(p => selectedImportIds.includes(p.id))
            .map(p => ({ name: p.organizationName, country: p.country, id: p.id }));
        store.importPartners(toImport);
        setShowImportDialog(false);
        setSelectedImportIds([]);
    };

    const toggleImportId = (id: string) => {
        setSelectedImportIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    return (
        <div className="space-y-6">

            {/* ============================================================ */}
            {/* IMPORT FROM PROJECT — prominent CTA                          */}
            {/* ============================================================ */}
            {hasImportableProjects && onImportClick && (
                <Card className="border-2 border-dashed border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50">
                    <CardContent className="py-6">
                        <button
                            onClick={onImportClick}
                            className="w-full flex items-center gap-4 text-left group"
                        >
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                                <FileUp className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                                    Fertigen Antrag importieren
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Lade WPs, Partner und Aktivitaeten aus einem generierten Antrag.
                                    Budgets werden automatisch nach Laendergruppen verteilt.
                                </p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                        </button>
                    </CardContent>
                </Card>
            )}

            {/* Divider */}
            {hasImportableProjects && onImportClick && (
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                        <span className="bg-gray-50 px-3 text-gray-400 font-medium">oder manuell konfigurieren</span>
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* ACTION TYPE & BUDGET TIER                                     */}
            {/* ============================================================ */}
            <Card>
                <CardContent className="pt-6 space-y-4">
                    <div>
                        <Label className="text-sm font-semibold text-gray-700 mb-3 block">Aktionstyp</Label>
                        <div className="flex gap-3">
                            {(['KA210', 'KA220'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => store.setActionType(type)}
                                    className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${
                                        store.actionType === type
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="font-bold text-lg">{type}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {type === 'KA210' ? 'Small-Scale Partnership' : 'Cooperation Partnership'}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label className="text-sm font-semibold text-gray-700 mb-3 block">Budget-Stufe (Lump Sum)</Label>
                        <div className="flex gap-3">
                            {tiers.map(tier => (
                                <button
                                    key={tier}
                                    onClick={() => store.setBudgetTier(tier)}
                                    className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${
                                        store.budgetTier === tier
                                            ? 'border-blue-500 bg-blue-50 font-bold'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="text-lg font-semibold">{tier.toLocaleString('de-DE')} EUR</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ============================================================ */}
            {/* PARTNERS                                                      */}
            {/* ============================================================ */}
            <Card>
                <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Users className="h-4 w-4 text-purple-500" />
                            Konsortium-Partner ({store.partners.length})
                        </Label>
                        {appPartners.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowImportDialog(true)}
                                className="text-purple-600"
                            >
                                <Import className="h-4 w-4 mr-1" />
                                Aus Partner-DB importieren
                            </Button>
                        )}
                    </div>

                    {/* Import Dialog (inline) */}
                    {showImportDialog && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                            <p className="text-sm font-medium text-purple-800">Partner aus Datenbank auswaehlen:</p>
                            <div className="max-h-48 overflow-y-auto space-y-2">
                                {appPartners.map(p => {
                                    const alreadyImported = store.partners.some(bp => bp.appStorePartnerId === p.id);
                                    return (
                                        <label
                                            key={p.id}
                                            className={`flex items-center gap-3 p-2 rounded hover:bg-purple-100 cursor-pointer ${alreadyImported ? 'opacity-40' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedImportIds.includes(p.id)}
                                                onChange={() => toggleImportId(p.id)}
                                                disabled={alreadyImported}
                                                className="rounded"
                                            />
                                            <span className="text-sm font-medium">{p.organizationName}</span>
                                            <span className="text-xs text-gray-500">{p.country}</span>
                                            {alreadyImported && <Badge variant="secondary" className="text-xs">bereits hinzugefuegt</Badge>}
                                        </label>
                                    );
                                })}
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" onClick={handleImport} disabled={selectedImportIds.length === 0}>
                                    {selectedImportIds.length} Partner importieren
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => { setShowImportDialog(false); setSelectedImportIds([]); }}>
                                    Abbrechen
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Partner List — now with country group indicators */}
                    {store.partners.length > 0 && (
                        <div className="space-y-2">
                            {store.partners.map((p) => {
                                const profile = getCountryProfile(p.country);
                                const groupMeta = COST_GROUP_META[profile.group];
                                return (
                                    <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                        <span className="text-sm font-medium text-gray-900 flex-1">{p.name}</span>
                                        <Badge className={`${groupMeta.bgColor} ${groupMeta.color} text-[10px] px-1.5`}>
                                            {p.country} · x{profile.staffMultiplier}
                                        </Badge>
                                        <Badge
                                            variant={p.role === 'coordinator' ? 'default' : 'secondary'}
                                            className={`text-xs cursor-pointer ${p.role === 'coordinator' ? 'bg-blue-600' : ''}`}
                                            onClick={() => {
                                                store.partners.forEach(pp => {
                                                    store.updatePartner(pp.id, { role: pp.id === p.id ? 'coordinator' : 'partner' });
                                                });
                                            }}
                                        >
                                            {p.role === 'coordinator' ? 'Koordinator' : 'Partner'}
                                        </Badge>
                                        <button
                                            onClick={() => store.removePartner(p.id)}
                                            className="text-gray-400 hover:text-red-500"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Add Partner Manual */}
                    <div className="flex gap-2">
                        <Input
                            placeholder="Organisationsname"
                            value={newPartnerName}
                            onChange={(e) => setNewPartnerName(e.target.value)}
                            className="flex-1"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddPartner()}
                        />
                        <Input
                            placeholder="Land (z.B. AT, DE, RO)"
                            value={newPartnerCountry}
                            onChange={(e) => setNewPartnerCountry(e.target.value)}
                            className="w-40"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddPartner()}
                        />
                        <Button onClick={handleAddPartner} disabled={!newPartnerName.trim() || !newPartnerCountry.trim()}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    {store.partners.length < 2 && (
                        <p className="text-xs text-amber-600">Mindestens 2 Partner erforderlich</p>
                    )}
                </CardContent>
            </Card>

            {/* ============================================================ */}
            {/* WORK PACKAGES                                                 */}
            {/* ============================================================ */}
            <Card>
                <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Layers className="h-4 w-4 text-teal-500" />
                            Arbeitspakete ({store.workPackages.length})
                        </Label>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => store.loadStandardWPs()}
                            className="text-teal-600"
                        >
                            <Sparkles className="h-4 w-4 mr-1" />
                            Standard WPs laden ({store.actionType === 'KA210' ? '3' : '5'} WPs)
                        </Button>
                    </div>

                    {/* WP List */}
                    {store.workPackages.length > 0 && (
                        <div className="space-y-2">
                            {store.workPackages.map(wp => (
                                <div key={wp.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    <Badge variant="outline" className="font-mono text-xs">WP{wp.number}</Badge>
                                    <span className="text-sm font-medium text-gray-900 flex-1">{wp.title}</span>
                                    {wp.targetPercent && (
                                        <span className="text-xs text-gray-500">~{wp.targetPercent}%</span>
                                    )}
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        placeholder="%"
                                        value={wp.targetPercent || ''}
                                        onChange={(e) => store.updateWorkPackage(wp.id, { targetPercent: parseInt(e.target.value) || undefined })}
                                        className="w-16 text-center text-xs h-8"
                                    />
                                    <button
                                        onClick={() => store.removeWorkPackage(wp.id)}
                                        className="text-gray-400 hover:text-red-500"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add WP Manual */}
                    <div className="flex gap-2">
                        <Input
                            placeholder="WP-Titel (z.B. Quality Assurance)"
                            value={newWPTitle}
                            onChange={(e) => setNewWPTitle(e.target.value)}
                            className="flex-1"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddWP()}
                        />
                        <Button onClick={handleAddWP} disabled={!newWPTitle.trim()}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* ============================================================ */}
            {/* START BUTTONS                                                 */}
            {/* ============================================================ */}
            <div className="flex items-center gap-4">
                {/* Smart start: go through distribution first */}
                {onStartWithDistribution && (
                    <Button
                        onClick={onStartWithDistribution}
                        disabled={!canStart}
                        className="flex-1 h-14 text-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                    >
                        <Percent className="h-5 w-5 mr-2" />
                        Weiter zur Budget-Verteilung
                    </Button>
                )}

                {/* Legacy: direct start (skip distribution, equal split) */}
                <Button
                    onClick={() => { store.autoDistribute(); store.setSetupComplete(true); }}
                    disabled={!canStart}
                    variant={onStartWithDistribution ? 'outline' : 'default'}
                    className={onStartWithDistribution
                        ? 'h-14 text-gray-600 border-gray-300'
                        : 'flex-1 h-14 text-lg bg-blue-600 hover:bg-blue-700 text-white'
                    }
                >
                    {onStartWithDistribution ? (
                        <>
                            <ArrowRight className="h-4 w-4 mr-1" />
                            Gleich-Verteilung & Starten
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-5 w-5 mr-2" />
                            Auto-Verteilen & Starten
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
