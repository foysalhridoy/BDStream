import React from 'react';

interface BrandLogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  iconOnly = false,
  size = 'md'
}) => {
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl'
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* WOW Glowing Futuristic Stream Icon */}
      <div className={`relative ${iconSizes[size]} flex-shrink-0 group-hover:scale-105 transition-all duration-300`}>
        {/* Ambient Neon Glow */}
        <div className="absolute inset-0 bg-[#d4ff00]/20 rounded-2xl blur-md opacity-40 group-hover:opacity-70 transition-opacity" />
        
        {/* Core Vector Icon */}
        <svg
          viewBox="0 0 100 100"
          className="relative w-full h-full drop-shadow-[0_4px_12px_rgba(212,255,0,0.35)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Main Outer Shield Gradient */}
            <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#18181c" />
              <stop offset="100%" stopColor="#09090b" />
            </linearGradient>

            {/* Neon Border Gradient */}
            <linearGradient id="neonBorder" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d4ff00" />
              <stop offset="100%" stopColor="#a3e635" />
            </linearGradient>

            {/* Futuristic Play Stream Flow Gradient */}
            <linearGradient id="streamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d4ff00" />
              <stop offset="100%" stopColor="#84cc16" />
            </linearGradient>
          </defs>

          {/* Squircle Base with Deep Inset */}
          <rect
            x="4"
            y="4"
            width="92"
            height="92"
            rx="26"
            fill="url(#shieldGrad)"
            stroke="url(#neonBorder)"
            strokeWidth="3.5"
          />

          {/* Inner Accent Border */}
          <rect
            x="7"
            y="7"
            width="86"
            height="86"
            rx="23"
            fill="none"
            stroke="#d4ff00"
            strokeWidth="1.5"
            strokeOpacity="0.3"
          />

          {/* BD Stream Monogram: 'B' */}
          <path
            d="M20 27C20 24.7909 21.7909 23 24 23H37C43.0751 23 48 27.9249 48 34C48 37.8931 45.9757 41.3142 42.9234 43.2721C46.6198 45.1952 49.1429 49.0305 49.1429 53.5C49.1429 60.4036 43.5464 66 36.6429 66H24C21.7909 66 20 64.2091 20 62V27Z"
            fill="#ffffff"
          />
          <path
            d="M28 31V41H36C38.2091 41 40 39.2091 40 37C40 34.7909 38.2091 33 36 33H28ZM28 48V58H36.5C38.9853 58 41 55.9853 41 53.5C41 51.0147 38.9853 49 36.5 49H28Z"
            fill="#09090b"
          />

          {/* Futuristic Play Arrow in Electric Lime */}
          <path
            d="M50 31C50 28.6723 52.5532 27.2407 54.5385 28.4552L79.0385 43.4552C80.9871 44.6475 80.9871 47.4525 79.0385 48.6448L54.5385 63.6448C52.5532 64.8593 50 63.4277 50 61.1L50 31Z"
            fill="url(#streamGrad)"
          />

          {/* ISP Network Signal Dot */}
          <circle cx="80" cy="20" r="4.5" fill="#d4ff00" />
          <circle cx="80" cy="20" r="2" fill="#ffffff" />
        </svg>
      </div>

      {/* Brand Typography */}
      {!iconOnly && (
        <div className="flex flex-col">
          <div className={`flex items-baseline font-black tracking-tight leading-none ${textSizes[size]}`}>
            <span className="text-neutral-950">BD</span>
            <span className="text-black font-extrabold ml-1 bg-[#d4ff00] px-1.5 py-0.5 rounded-md text-[0.85em] shadow-sm">
              Stream
            </span>
          </div>
          <span className="hidden sm:flex text-[10px] font-extrabold tracking-wider text-neutral-500 uppercase mt-1 items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            ISP Media Platform
          </span>
        </div>
      )}
    </div>
  );
};
