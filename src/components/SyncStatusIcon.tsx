'use client';

import React from 'react';
import { useSyncStatus } from '@/src/hooks/useSyncStatus';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/src/context/LanguageContext';

export const SyncStatusIcon: React.FC = () => {
    const { isOnline, isSyncing, pendingCount, triggerSync } = useSyncStatus();
    const { t } = useTranslation();

    return (
        <button
            onClick={triggerSync}
            disabled={isSyncing || !isOnline}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all active:scale-95 disabled:opacity-50"
            title={isSyncing ? t('sync.syncInProgress') : t('sync.clickToSync')}
        >
            {isSyncing ? (
                <RefreshCw className="w-4 h-4 text-primary animate-spin" />
            ) : isOnline ? (
                <Cloud className="w-4 h-4 text-green-500" />
            ) : (
                <CloudOff className="w-4 h-4 text-orange-500" />
            )}
            <span className="text-xs font-semibold text-gray-700">
                {isSyncing ? t('sync.syncingShort') : isOnline ? t('sync.synced') : t('sync.offline')}
                {pendingCount > 0 && (
                    <span className="ml-1 bg-primary text-white px-1.5 py-0.5 rounded-full text-[10px]">
                        {pendingCount}
                    </span>
                )}
            </span>
        </button>
    );
};
