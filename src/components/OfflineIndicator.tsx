import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, Database } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors bg-emerald-50 text-emerald-800 border border-emerald-200">
      <Database className="w-3.5 h-3.5 text-emerald-600" />
      <span>SQLite محلي 100%</span>
      {!isOnline && (
        <span className="flex items-center gap-1 text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded mr-1">
          <WifiOff className="w-3 h-3" />
          <span>بدون إنترنت</span>
        </span>
      )}
    </div>
  );
};
