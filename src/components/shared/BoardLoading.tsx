import React from 'react';
import { Loader2 } from 'lucide-react';

export function BoardLoading({ children }: { children: React.ReactNode }) {
  return <div role="status" className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
    <Loader2 aria-hidden="true" className="w-8 h-8 animate-spin text-slate-300" />
    <span className="text-sm font-medium">{children}</span>
  </div>;
}
