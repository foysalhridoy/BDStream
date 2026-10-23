import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play } from 'lucide-react';
import { MediaItem } from '../../types/media';
import { ApiService } from '../../services/api';

interface HeroCoverflowProps {
  items: MediaItem[];
  onPlayDirect: (item: MediaItem) => void;
  onSelectItem?: (item: MediaItem) => void;
}

export const HeroCoverflow: React.FC<HeroCoverflowProps> = ({
  items,
  onPlayDirect
}) => {
  const [activeIndex, setActiveIndex] = useState(() => {
    const hitlerIdx = items.findIndex(i => i.title.toLowerCase().includes('hitler'));
    return hitlerIdx !== -1 ? hitlerIdx : (items.length > 1 ? 1 : 0);
  });
  const [isPaused, setIsPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Gesture swiping refs (Mobile touch, Tablet, Mouse drag)
  const dragStartXRef = useRef<number | null>(null);
  const dragStartYRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const hasSwipedRef = useRef(false);

  const total = items.length;

  useEffect(() => {
    const hitlerIdx = items.findIndex(i => i.title.toLowerCase().includes('hitler'));
    if (hitlerIdx !== -1) {
      setActiveIndex(hitlerIdx);
    }
  }, [items]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const nextSlide = useCallback(() => {
    if (total <= 1) return;
    setActiveIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    if (total <= 1) return;
    setActiveIndex((prev) => (prev === 0 ? total - 1 : prev - 1));
  }, [total]);

  // Auto-rotation every 4.5 seconds (pauses on hover)
  useEffect(() => {
    if (total <= 1 || isPaused) return;

    timerRef.current = window.setInterval(() => {
      nextSlide();
    }, 4500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [total, isPaused, nextSlide]);

  if (!items || items.length === 0) return null;

  // Gesture handlers for swiping left & right
  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartXRef.current = e.clientX;
    dragStartYRef.current = e.clientY;
    isDraggingRef.current = true;
    hasSwipedRef.current = false;
    setIsPaused(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || dragStartXRef.current === null || dragStartYRef.current === null) return;
    const diffX = e.clientX - dragStartXRef.current;
    const diffY = e.clientY - dragStartYRef.current;

    // Detect horizontal swipe intention
    if (Math.abs(diffX) > 18 && Math.abs(diffX) > Math.abs(diffY)) {
      hasSwipedRef.current = true;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || dragStartXRef.current === null) return;
    isDraggingRef.current = false;
    setIsPaused(false);

    const diffX = e.clientX - dragStartXRef.current;
    // Trigger card switch if swiped more than 30px
    if (diffX < -30) {
      nextSlide();
    } else if (diffX > 30) {
      prevSlide();
    }

    // Keep hasSwipedRef true briefly to prevent triggering card direct play
    setTimeout(() => {
      hasSwipedRef.current = false;
    }, 120);

    dragStartXRef.current = null;
    dragStartYRef.current = null;
  };

  const handlePointerCancel = () => {
    isDraggingRef.current = false;
    dragStartXRef.current = null;
    dragStartYRef.current = null;
    setIsPaused(false);
    setTimeout(() => {
      hasSwipedRef.current = false;
    }, 120);
  };

  // Helper to calculate circular distance and 3D transform properties
  const getCardStyle = (index: number) => {
    // Circular offset: -3, -2, -1, 0, 1, 2, 3
    let offset = index - activeIndex;
    if (offset > total / 2) offset -= total;
    if (offset < -total / 2) offset += total;

    const absOffset = Math.abs(offset);

    // On mobile, only render center + 1 left + 1 right card to strictly avoid overflow
    const maxOffset = isMobile ? 1 : 3;
    if (absOffset > maxOffset) {
      return {
        display: 'none',
        zIndex: 0,
        opacity: 0,
        pointerEvents: 'none' as const
      };
    }

    // Responsive horizontal spacing (percentages)
    let translateX = 0;
    if (offset !== 0) {
      const sign = offset > 0 ? 1 : -1;
      if (isMobile) {
        translateX = sign * 44;
      } else {
        if (absOffset === 1) translateX = sign * 58;
        else if (absOffset === 2) translateX = sign * 106;
        else if (absOffset === 3) translateX = sign * 148;
      }
    }

    // Scale down cards as they move away from center
    const scale = offset === 0 ? (isMobile ? 1.08 : 1.12) : Math.max(0.72, 0.96 - absOffset * 0.12);

    // Gentle 3D rotation angle: soft and natural
    const rotateY = offset === 0 ? 0 : (offset > 0 ? -12 : 12);

    // Z-translation to physically elevate the center card
    const translateZ = offset === 0 ? (isMobile ? 25 : 45) : (absOffset === 1 ? 0 : -25 * (absOffset - 1));

    // Stacking order: center is unequivocally on top of both left and right cards!
    const zIndex = offset === 0 ? 50 : 35 - absOffset * 8;

    // Opacity: center 100%, outer cards slightly dim
    const opacity = offset === 0 ? 1 : Math.max(0.55, 1 - absOffset * 0.18);

    return {
      transform: `translateX(${translateX}%) translateZ(${translateZ}px) scale(${scale}) rotateY(${rotateY}deg)`,
      zIndex,
      opacity,
      transition: 'transform 0.65s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1), filter 0.65s ease',
      willChange: 'transform, opacity',
      backfaceVisibility: 'hidden' as const,
      boxShadow: offset === 0
        ? '0 25px 50px -12px rgba(15, 23, 42, 0.4), 0 0 0 2px rgba(15, 23, 42, 0.8)'
        : '0 12px 25px -8px rgba(15, 23, 42, 0.2)',
      filter: offset === 0 ? 'brightness(1) contrast(1.02)' : 'brightness(0.85) contrast(0.98)'
    };
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className="relative w-full select-none py-0 sm:py-4 cursor-grab active:cursor-grabbing touch-pan-y"
      style={{ touchAction: 'pan-y' }}
    >
      {/* 3D Coverflow Stage with snug mobile height removing dead vertical space */}
      <div
        className="relative w-full h-[225px] xs:h-[265px] sm:h-[400px] md:h-[480px] flex items-center justify-center overflow-visible my-0 sm:my-2"
        style={{ perspective: '1200px' }}
      >
        {items.map((item, index) => {
          const style = getCardStyle(index);
          const isCenter = index === activeIndex;

          return (
            <div
              key={item.id}
              onClick={(e) => {
                if (hasSwipedRef.current) {
                  e.stopPropagation();
                  return;
                }
                onPlayDirect(item);
              }}
              style={style}
              title={`Direct Play: ${item.title}`}
              className={`absolute w-32 xs:w-40 sm:w-52 md:w-60 aspect-[2/3] rounded-[20px] overflow-hidden cursor-pointer group origin-center transition-all ${
                isCenter ? 'ring-3 ring-[#d4ff00] shadow-[0_20px_50px_-10px_rgba(212,255,0,0.35),0_15px_30px_-10px_rgba(15,23,42,0.25)]' : 'hover:brightness-105'
              }`}
            >
              {/* Poster Image */}
              <img
                src={ApiService.getProxyAssetUrl(item.posterUrl || '')}
                alt={item.title}
                loading="lazy"
                className="w-full h-full object-cover rounded-[20px] pointer-events-none transition-transform duration-500 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />

              {/* Hover Quick Play Cue */}
              <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#d4ff00] text-black flex items-center justify-center shadow-2xl shadow-lime-500/40 transform transition-transform group-hover:scale-110">
                  <Play className="w-6 h-6 ml-0.5 fill-black text-black" />
                </div>
              </div>

              {/* Title Pill at Bottom of Center Card */}
              {isCenter && (
                <div className="absolute bottom-2.5 sm:bottom-3 left-1/2 -translate-x-1/2 max-w-[85%] bg-black/90 backdrop-blur-md px-3.5 py-1 rounded-xl text-[11px] sm:text-xs font-bold text-white tracking-wide truncate border border-white/20 shadow-lg pointer-events-none flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d4ff00] animate-pulse flex-shrink-0 shadow-[0_0_8px_rgba(212,255,0,0.8)]" />
                  <span className="truncate">{item.title}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination Dots */}
      <div className="flex items-center justify-center gap-1.5 mt-1 sm:mt-3">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              setActiveIndex(i);
            }}
            className={`h-1.5 rounded-full transition-all ${
              i === activeIndex
                ? 'w-7 bg-[#d4ff00] shadow-sm'
                : 'w-1.5 bg-neutral-300 hover:bg-neutral-400'
            }`}
            title={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
