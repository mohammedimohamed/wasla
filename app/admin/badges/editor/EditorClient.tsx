'use client';

import { useState } from 'react';
import { Building2, ListTodo, Printer } from 'lucide-react';
import TabCompany from './tabs/TabCompany';
import TabFormBuilder from './tabs/TabFormBuilder';
import TabExportStudio from './tabs/TabExportStudio';
import LivePreviewCard from './LivePreviewCard';

export interface CustomField {
    id: string; label: string; field_key: string; field_type: string; is_required: boolean; sort_order: number; placeholder: string | null;
}

interface Props {
    initialCompanyProfile: any;
    initialCustomFields: CustomField[];
    sampleAgent: any;
}

export default function EditorClient({ initialCompanyProfile, initialCustomFields, sampleAgent }: Props) {
    const [activeTab, setActiveTab] = useState<'company' | 'form' | 'export'>('company');
    
    // Live State
    const [companyProfile, setCompanyProfile] = useState(initialCompanyProfile);
    const [customFields, setCustomFields] = useState<CustomField[]>(initialCustomFields);

    const tabs = [
        { id: 'company', label: 'Marque & Entreprise', icon: Building2 },
        { id: 'form', label: 'Form Builder', icon: ListTodo },
        { id: 'export', label: "Studio d'Export", icon: Printer },
    ];

    return (
        <div className="flex h-full gap-8">
            {/* ── LEFT PANEL : CONTROLS ── */}
            <div className="flex-1 flex flex-col h-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                {/* Tab Navigation */}
                <div className="flex border-b border-slate-200 bg-slate-50 p-2 gap-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all text-sm ${
                                activeTab === tab.id 
                                ? 'bg-white text-blue-600 shadow-sm border border-slate-200' 
                                : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Scrollable Tab Content */}
                <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                    {activeTab === 'company' && (
                        <TabCompany 
                            profile={companyProfile} 
                            onChange={(updated) => setCompanyProfile({ ...companyProfile, ...updated })} 
                        />
                    )}
                    {activeTab === 'form' && (
                        <TabFormBuilder 
                            fields={customFields} 
                            onChange={setCustomFields} 
                        />
                    )}
                    {activeTab === 'export' && (
                        <TabExportStudio 
                            companyProfile={companyProfile}
                        />
                    )}
                </div>
            </div>

            {/* ── RIGHT PANEL : LIVE PREVIEW (Sticky) ── */}
            <div className="w-[450px] shrink-0 h-full relative">
                <div className="sticky top-0 h-full w-full">
                    <LivePreviewCard 
                        companyProfile={companyProfile} 
                        customFields={customFields}
                        agent={sampleAgent}
                    />
                </div>
            </div>
        </div>
    );
}
