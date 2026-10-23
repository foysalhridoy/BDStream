import React from 'react';
import { ShieldCheck, HardDrive, Keyboard } from 'lucide-react';

interface FooterProps {
  onOpenShortcuts?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenShortcuts }) => {
  return (
    <footer className="border-t border-bdstream-border bg-bdstream-dark/60 mt-16 py-8 text-xs text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-vlc-orange/20 text-vlc-orange rounded flex items-center justify-center font-bold text-xs">
            BD
          </div>
          <div>
            <p className="font-semibold text-gray-200">BDStream</p>
            <p className="text-[11px] text-gray-500">
              Direct ISP streaming platform with VLC-inspired engine
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-[11px]">
          <span className="flex items-center gap-1.5 text-gray-400">
            <HardDrive className="w-3.5 h-3.5 text-vlc-orange" />
            Direct Byte-Range Playback
          </span>
          <span className="flex items-center gap-1.5 text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            SSRF Guard & Allowlist Enforced
          </span>
          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              className="flex items-center gap-1.5 text-vlc-orange hover:underline cursor-pointer"
            >
              <Keyboard className="w-3.5 h-3.5" />
              Keyboard Shortcuts
            </button>
          )}
        </div>

        <p className="text-[11px] text-gray-500">
          Source: DhakaFlix (172.16.50.4)
        </p>
      </div>
    </footer>
  );
};
