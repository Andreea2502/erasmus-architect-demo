"use client";

import React, { useState } from 'react';
import { ClipboardCopy, Download, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    useBudgetCalculatorStore,
    COST_CATEGORIES,
    getCellAmount,
    getWPPartnerTotal,
    getWPTotal,
    getCategoryRowTotal,
    getPartnerGrandTotal,
    getGrandTotal,
} from '@/store/budget-calculator-store';

function buildTableData(store: ReturnType<typeof useBudgetCalculatorStore.getState>) {
    const { partners, workPackages, cells, budgetTier } = store;
    const rows: string[][] = [];

    // Header row
    const header = ['Work Package', 'Kostenkategorie'];
    partners.forEach(p => header.push(p.name));
    header.push('TOTAL');
    rows.push(header);

    // Per WP
    for (const wp of workPackages) {
        // Category rows
        for (const cat of COST_CATEGORIES) {
            const row = [`WP${wp.number}: ${wp.titleDE}`, cat.labelDE];
            partners.forEach(p => {
                row.push(getCellAmount(cells, wp.id, p.id, cat.key).toString());
            });
            row.push(getCategoryRowTotal(cells, wp.id, cat.key, partners).toString());
            rows.push(row);
        }

        // WP subtotal
        const subRow = [`WP${wp.number} Gesamt`, ''];
        partners.forEach(p => {
            subRow.push(getWPPartnerTotal(cells, wp.id, p.id).toString());
        });
        subRow.push(getWPTotal(cells, wp.id, partners).toString());
        rows.push(subRow);

        // Empty separator row
        rows.push(new Array(header.length).fill(''));
    }

    // Grand total row
    const grandRow = ['GESAMTBUDGET', ''];
    partners.forEach(p => {
        grandRow.push(getPartnerGrandTotal(cells, p.id, workPackages).toString());
    });
    grandRow.push(getGrandTotal(cells, workPackages, partners).toString());
    rows.push(grandRow);

    // Budget tier row
    const tierRow = ['Budget-Stufe', ''];
    partners.forEach(() => tierRow.push(''));
    tierRow.push(budgetTier.toString());
    rows.push(tierRow);

    return rows;
}

export function BudgetExport() {
    const store = useBudgetCalculatorStore();
    const [copied, setCopied] = useState(false);

    const handleCopyClipboard = async () => {
        const rows = buildTableData(store);
        const tsv = rows.map(row => row.join('\t')).join('\n');
        try {
            await navigator.clipboard.writeText(tsv);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = tsv;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDownloadCSV = () => {
        const rows = buildTableData(store);
        // CSV with semicolon separator (common in DE/EU locale for Excel)
        const csv = rows.map(row =>
            row.map(cell => {
                if (cell.includes(';') || cell.includes('"') || cell.includes('\n')) {
                    return `"${cell.replace(/"/g, '""')}"`;
                }
                return cell;
            }).join(';')
        ).join('\n');

        const BOM = '\uFEFF'; // UTF-8 BOM for Excel
        const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `budget_${store.actionType}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-gray-900">Export</h3>
                    <p className="text-sm text-gray-500">
                        Budgettabelle exportieren oder in die Zwischenablage kopieren
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyClipboard}
                        className={copied ? 'text-emerald-600 border-emerald-300' : ''}
                    >
                        {copied ? (
                            <>
                                <Check className="h-4 w-4 mr-1" />
                                Kopiert!
                            </>
                        ) : (
                            <>
                                <ClipboardCopy className="h-4 w-4 mr-1" />
                                In Zwischenablage
                            </>
                        )}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadCSV}
                    >
                        <Download className="h-4 w-4 mr-1" />
                        CSV herunterladen
                    </Button>
                </div>
            </div>
        </div>
    );
}
