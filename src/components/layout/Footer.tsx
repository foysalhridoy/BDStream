import React from 'react';
import { ShieldCheck, HardDrive, Keyboard } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface FooterProps {
  onOpenShortcuts?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenShortcuts }) => {
  return (
    <footer className="border-t border-neutral-200/80 bg-white mt-4 sm:mt-8 py-4 sm:py-5 text-xs text-neutral-500 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <BrandLogo size="sm" />
        </div>

        {/* Feature Badges - perfectly aligned and responsive on all devices */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[11px]">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200/70 font-medium shadow-2xs">
            <HardDrive className="w-3.5 h-3.5 text-neutral-800" />
            Byte-Range Streaming
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200/70 font-medium shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            SSRF Guard Active
          </span>
          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 hover:bg-[#d4ff00] hover:text-black border border-neutral-200/70 text-neutral-800 transition-colors cursor-pointer font-bold shadow-2xs"
            >
              <Keyboard className="w-3.5 h-3.5 text-neutral-700" />
              Keyboard Shortcuts
            </button>
          )}
        </div>

        {/* Sources Info */}
        <p className="text-[11px] text-neutral-400 font-mono text-center md:text-right">
          Sources: DhakaFlix &bull; CinePlex BD &bull; BAS Play
        </p>
      </div>
    </footer>
  );
};
