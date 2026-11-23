/**
 * TopBar: Clean 3-zone studio top bar.
 * Zone 1: Brand wordmark
 * Zone 2: Active project metadata (unboxed clean text)
 * Zone 3: Primary Export CTA
 */

import React from 'react';
import { Download } from 'lucide-react';

interface TopBarProps {
  demoTitle: string;
  onOpenExport: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ demoTitle, onOpenExport }) => {
  return (
    <header className="flex items-center justify-between gap-4 sm:gap-8 h-12 px-3 sm:px-5 bg-[#12151e] border-b border-[#222736] shrink-0">
      {/* Zone 1: Single-element brand wordmark */}
      <div className="font-display font-bold tracking-tight text-sm sm:text-base text-white whitespace-nowrap shrink-0">
        ANIMA 3D STUDIO
      </div>

      {/* Zone 2: Active project info (clean unboxed metadata) */}
      <div className="hidden md:flex items-center gap-2.5 min-w-0 text-xs text-slate-400">
        <span className="text-slate-200 font-medium truncate max-w-[340px]">
          {demoTitle}
        </span>
        <span aria-hidden="true">·</span>
        <span className="whitespace-nowrap shrink-0">20s · 9:16</span>
        <span aria-hidden="true">·</span>
        <span className="whitespace-nowrap shrink-0">v0.1</span>
      </div>

      {/* Zone 3: Primary studio action */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onOpenExport}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-[#081018] font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar</span>
        </button>
      </div>
    </header>
  );
};
