import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Subtitles,
  Settings as SettingsIcon,
  Info,
  Tv,
  AlertCircle,
  RefreshCw,
  Sliders,
  Check,
  Headphones,
  PictureInPicture2
} from 'lucide-react';
import Hls from 'hls.js';
import { PlaybackDescriptor, SubtitleTrack, WatchProgress } from '../../types/media';
import { formatTime, clamp } from '../../services/playerUtils';
import { srtToVtt } from '../../services/subtitleParser';
import { StorageService } from '../../services/storage';

interface VlcPlayerProps {
  playback: PlaybackDescriptor;
  initialTime?: number;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  isCinemaMode?: boolean;
  onToggleCinemaMode?: () => void;
  onClose?: () => void;
}

export const VlcPlayer: React.FC<VlcPlayerProps> = ({
  playback,
  initialTime = 0,
  onTimeUpdate,
  onEnded,
  isCinemaMode = false,
  onToggleCinemaMode,
  onClose
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const isScrubbingRef = useRef<boolean>(false);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRemainingTime, setShowRemainingTime] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useDirectStream, setUseDirectStream] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Hover time preview on scrub bar
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);

  // Subtitles & Modals
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>(playback.subtitles || []);
  const [activeSubtitleId, setActiveSubtitleId] = useState<string | null>(null);
  const [subtitleDelay, setSubtitleDelay] = useState<number>(0); // ms
  const [subtitleBlobUrl, setSubtitleBlobUrl] = useState<string | null>(null);

  // Audio Tracks
  const [audioTracks, setAudioTracks] = useState<{ id: string; label: string; language: string; enabled: boolean }[]>([]);
  const [showAudioMenu, setShowAudioMenu] = useState(false);

  // Dropdowns & panels
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [audioBoost, setAudioBoost] = useState(false);

  // Web Audio Context for 5.1/Low Audio Boost
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Stream stats
  const [stats, setStats] = useState({
    videoWidth: 0,
    videoHeight: 0,
    decodedFrames: 0,
    droppedFrames: 0
  });

  // 1. Initial setup & stream binding (HLS vs Progressive HTTP)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);
    setIsBuffering(true);

    let hls: Hls | null = null;
    const streamUrl = useDirectStream ? playback.directUrl : (playback.relayStreamUrl || playback.directUrl);

    if (playback.streamType === 'hls' || streamUrl.includes('.m3u8')) {
      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true
        });
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_event, data) => {
          if (data.audioTracks && data.audioTracks.length > 0) {
            setAudioTracks(data.audioTracks.map((t, idx) => ({
              id: String(t.id !== undefined ? t.id : idx),
              label: t.name || `Track ${idx + 1}`,
              language: t.lang || '',
              enabled: idx === hls?.audioTrack
            })));
          }
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            setError(`Stream error: ${data.details}`);
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
      }
    } else {
      // Native Progressive stream
      video.src = streamUrl;
    }

    // Check saved progress - separate by episode URL so series episodes don't share timestamps
    const isSeriesEpisode = Boolean(playback.directUrl && (playback.title.includes('S0') || playback.title.includes('S1') || playback.title.includes('Episode') || playback.title.includes('E0') || playback.title.includes('E1')));
    const saved = isSeriesEpisode && playback.directUrl
      ? StorageService.getEpisodeProgress(playback.itemId, playback.directUrl)
      : StorageService.getProgress(playback.itemId);

    if (initialTime > 0) {
      video.currentTime = initialTime;
    } else if (saved && saved.currentTime > 10 && saved.currentTime < (saved.duration - 20)) {
      video.currentTime = saved.currentTime;
    } else {
      video.currentTime = 0;
    }

    return () => {
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
      if (subtitleBlobUrl) {
        URL.revokeObjectURL(subtitleBlobUrl);
      }
    };
  }, [playback, useDirectStream, initialTime]);

  // 2. Auto-hide controls timer
  const resetControlsTimer = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = window.setTimeout(() => {
        setControlsVisible(false);
        setShowSpeedMenu(false);
        setShowSubtitleMenu(false);
        setShowQualityMenu(false);
        setShowAudioMenu(false);
        setShowSettingsMenu(false);
      }, 3000);
    }
  }, [isPlaying]);

  const handleMouseMove = () => {
    resetControlsTimer();
  };

  // Audio Booster & Stereo Dialogue Enhancer
  const toggleAudioBoost = () => {
    try {
      const video = videoRef.current;
      if (!video) return;

      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaElementSource(video);
        sourceNodeRef.current = source;
        const gain = ctx.createGain();
        gainNodeRef.current = gain;
        source.connect(gain);
        gain.connect(ctx.destination);
      }

      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }

      if (gainNodeRef.current) {
        const nextBoost = !audioBoost;
        gainNodeRef.current.gain.value = nextBoost ? 2.5 : 1.0;
        setAudioBoost(nextBoost);
      }
    } catch (e) {
      console.warn('Audio boost warning:', (e as Error).message);
    }
  };

  // 3. Play / Pause toggle
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }

    if (video.paused) {
      video.play().catch(err => {
        console.warn('Play was prevented:', err.message);
      });
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
    resetControlsTimer();
  };

  // 4. Seek forward / backward
  const seekRelative = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = clamp(video.currentTime + seconds, 0, duration);
    resetControlsTimer();
  };

  // 5. Volume handling
  const handleVolumeChange = (newVol: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = clamp(newVol, 0, 1);
    video.volume = clamped;
    video.muted = clamped === 0;
    setVolume(clamped);
    setIsMuted(clamped === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.muted = false;
      video.volume = volume > 0 ? volume : 1;
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  // 6. Playback speed
  const changeSpeed = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  };

  // 7. Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // 8. Picture in Picture
  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('PiP failed:', (e as Error).message);
    }
  };

  // 9. Timeline scrub events
  const updateScrubTime = (clientX: number) => {
    if (!timelineRef.current || !videoRef.current || duration === 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pos = clamp((clientX - rect.left) / rect.width, 0, 1);
    const targetTime = pos * duration;
    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
    setHoverPosition(pos * 100);
    setHoverTime(targetTime);
  };

  const handleTimelinePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    isScrubbingRef.current = true;
    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {}
    updateScrubTime(e.clientX);
    resetControlsTimer();
  };

  const handleTimelinePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!timelineRef.current || duration === 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pos = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    setHoverPosition(pos * 100);
    setHoverTime(pos * duration);

    if (isScrubbingRef.current) {
      updateScrubTime(e.clientX);
    }
  };

  const handleTimelinePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isScrubbingRef.current) {
      isScrubbingRef.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {}
      // Keep hover time visible briefly so user sees skipped target
      setTimeout(() => {
        if (!isScrubbingRef.current) {
          setHoverTime(null);
        }
      }, 1000);
    }
  };

  const handleTimelinePointerLeave = () => {
    if (!isScrubbingRef.current) {
      setHoverTime(null);
    }
  };

  // 10. Subtitle loading & delay sync
  const selectSubtitle = async (sub: SubtitleTrack | null) => {
    setActiveSubtitleId(sub ? sub.id : null);
    setShowSubtitleMenu(false);

    if (subtitleBlobUrl) {
      URL.revokeObjectURL(subtitleBlobUrl);
      setSubtitleBlobUrl(null);
    }

    if (!sub) return;

    try {
      // Fetch subtitle file content
      const res = await fetch(sub.url);
      const content = await res.text();
      const vtt = sub.format === 'srt' ? srtToVtt(content, subtitleDelay) : content;
      const blob = new Blob([vtt], { type: 'text/vtt' });
      const blobUrl = URL.createObjectURL(blob);
      setSubtitleBlobUrl(blobUrl);
    } catch (e) {
      console.warn('Failed to load subtitle:', (e as Error).message);
    }
  };

  const adjustSubtitleDelay = (deltaMs: number) => {
    const newDelay = subtitleDelay + deltaMs;
    setSubtitleDelay(newDelay);
    // Reload active subtitle with new delay
    const active = subtitles.find(s => s.id === activeSubtitleId);
    if (active) {
      selectSubtitle(active);
    }
  };

  const handleCustomSubtitleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const isSrt = file.name.endsWith('.srt');
      const vtt = isSrt ? srtToVtt(text, subtitleDelay) : text;
      const blob = new Blob([vtt], { type: 'text/vtt' });
      const blobUrl = URL.createObjectURL(blob);

      const customSub: SubtitleTrack = {
        id: `custom-${Date.now()}`,
        label: file.name,
        language: 'Custom',
        url: blobUrl,
        format: isSrt ? 'srt' : 'vtt'
      };

      setSubtitles(prev => [customSub, ...prev]);
      setActiveSubtitleId(customSub.id);
      setSubtitleBlobUrl(blobUrl);
      setShowSubtitleMenu(false);
    };
    reader.readAsText(file);
  };

  // 11. Keyboard shortcut handlers (Section 7 specs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not intercept if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      switch (e.key) {
        case ' ': // Space: Play/Pause
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft': // Seek backward
          e.preventDefault();
          seekRelative(e.shiftKey ? -30 : -5);
          break;
        case 'ArrowRight': // Seek forward
          e.preventDefault();
          seekRelative(e.shiftKey ? 30 : 5);
          break;
        case 'ArrowUp': // Volume up
          e.preventDefault();
          handleVolumeChange(volume + 0.05);
          break;
        case 'ArrowDown': // Volume down
          e.preventDefault();
          handleVolumeChange(volume - 0.05);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 'c':
        case 'C': // Toggle subtitles
          e.preventDefault();
          if (activeSubtitleId) {
            setActiveSubtitleId(null);
          } else if (subtitles.length > 0) {
            selectSubtitle(subtitles[0]);
          }
          break;
        case '[': // Decrease speed
          e.preventDefault();
          changeSpeed(Math.max(0.25, playbackSpeed - 0.25));
          break;
        case ']': // Increase speed
          e.preventDefault();
          changeSpeed(Math.min(2, playbackSpeed + 0.25));
          break;
        case 'p':
        case 'P': // Toggle Picture-in-Picture
          e.preventDefault();
          togglePiP();
          break;
        case 'Escape':
          if (isFullscreen) {
            document.exitFullscreen().catch(() => {});
            setIsFullscreen(false);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, volume, isMuted, playbackSpeed, isFullscreen, activeSubtitleId, subtitles, duration]);

  // 12. Video element event listeners
  const onLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration || 0);
    setIsBuffering(false);
    setStats(prev => ({
      ...prev,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight
    }));

    if ((video as any).audioTracks) {
      const at = (video as any).audioTracks;
      const tracks: { id: string; label: string; language: string; enabled: boolean }[] = [];
      for (let i = 0; i < at.length; i++) {
        tracks.push({
          id: String(i),
          label: at[i].label || `Audio Track ${i + 1}`,
          language: at[i].language || '',
          enabled: at[i].enabled
        });
      }
      if (tracks.length > 0) setAudioTracks(tracks);
    }
  };

  const switchAudioTrack = (index: number) => {
    if (hlsRef.current) {
      hlsRef.current.audioTrack = index;
    }
    const video = videoRef.current;
    if (video && (video as any).audioTracks) {
      const tracks = (video as any).audioTracks;
      for (let i = 0; i < tracks.length; i++) {
        tracks[i].enabled = i === index;
      }
    }
    setAudioTracks(prev => prev.map((t, idx) => ({ ...t, enabled: idx === index })));
    setShowAudioMenu(false);
  };

  const onTimeUpdateHandler = () => {
    const video = videoRef.current;
    if (!video) return;
    const cur = video.currentTime;
    setCurrentTime(cur);

    // Update buffered range
    if (video.buffered.length > 0) {
      setBufferedEnd(video.buffered.end(video.buffered.length - 1));
    }

    // Call parent handler
    if (onTimeUpdate) {
      onTimeUpdate(cur, video.duration || 0);
    }

    // Auto-save watch progress
    const progress: WatchProgress = {
      itemId: playback.itemId,
      title: playback.title,
      currentTime: cur,
      duration: video.duration || 0,
      posterUrl: playback.posterUrl,
      source: playback.source,
      lastWatchedAt: new Date().toISOString()
    };
    if (playback.directUrl) {
      StorageService.saveEpisodeProgress(playback.itemId, playback.directUrl, progress);
    } else {
      StorageService.saveProgress(progress);
    }
  };

  const onWaitingHandler = () => setIsBuffering(true);
  const onPlayingHandler = () => {
    setIsBuffering(false);
    setIsPlaying(true);
  };
  const onPauseHandler = () => setIsPlaying(false);
  const onEndedHandler = () => {
    setIsPlaying(false);
    if (playback.directUrl) {
      StorageService.clearProgress(`${playback.itemId}:::${playback.directUrl}`);
    }
    StorageService.clearProgress(playback.itemId);
    if (onEnded) onEnded();
  };

  const onErrorHandler = () => {
    const video = videoRef.current;
    const code = video?.error?.code;
    let msg = 'Failed to load video stream.';
    if (code === 1) msg = 'Playback was aborted.';
    if (code === 2) msg = 'Network error while loading video.';
    if (code === 3) msg = 'Video decoding failed or codec is unsupported by browser.';
    if (code === 4) msg = 'Source format is not supported by your browser.';
    setError(msg);
    setIsBuffering(false);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`relative bg-black select-none overflow-hidden group flex flex-col justify-center items-center ${
        isCinemaMode ? 'w-full h-[85vh] rounded-none' : 'w-full aspect-video rounded-xl shadow-2xl border border-bdstream-border'
      }`}
    >
      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain cursor-pointer"
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdateHandler}
        onWaiting={onWaitingHandler}
        onPlaying={onPlayingHandler}
        onPause={onPauseHandler}
        onEnded={onEndedHandler}
        onError={onErrorHandler}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        playsInline
      >
        {subtitleBlobUrl && (
          <track
            kind="subtitles"
            label="Active Subtitle"
            src={subtitleBlobUrl}
            default
          />
        )}
      </video>

      {/* Buffering Indicator */}
      {isBuffering && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-[#d4ff00] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono text-neutral-300">Buffering Stream...</span>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-30 p-6 text-center">
          <div className="max-w-lg bg-bdstream-surface border border-red-500/40 rounded-2xl p-6 shadow-2xl">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">Playback Notice</h3>
            <p className="text-xs text-gray-300 mb-4">{error}</p>
            <p className="text-[11px] text-gray-400 mb-5 leading-relaxed">
              If your browser lacks native codecs for this specific MKV container (e.g. AC3/E-AC3 audio or HEVC 10-bit), you can switch to Direct Stream mode, copy the URL to paste into VLC Desktop, or open directly in your media player.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => {
                  setError(null);
                  setUseDirectStream(!useDirectStream);
                }}
                className="px-4 py-2 bg-[#d4ff00] hover:bg-[#c4ec00] text-black text-xs font-extrabold rounded-full flex items-center gap-1.5 transition-colors shadow-lg shadow-lime-500/20"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {useDirectStream ? 'Try Relay Stream' : 'Switch to Direct ISP Stream'}
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(playback.directUrl);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2500);
                }}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {copiedLink ? 'Copied URL!' : 'Copy Link for VLC'}
              </button>

              <a
                href={playback.directUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-medium rounded-lg transition-colors"
              >
                Open Direct URL
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar (Fullscreen & Cinema Mode - clean & uncluttered) */}
      {(isFullscreen || isCinemaMode) && (
        <div
          className={`absolute top-0 left-0 right-0 p-2 sm:p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between text-white transition-opacity duration-300 z-20 ${
            controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {onClose && (
              <button
                onClick={onClose}
                className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold backdrop-blur-md transition-colors flex-shrink-0"
                title="Back"
              >
                &larr; Back
              </button>
            )}
            <div className="min-w-0">
              <h2 className="text-xs sm:text-base font-semibold text-white drop-shadow truncate max-w-[140px] xs:max-w-[220px] sm:max-w-md md:max-w-xl">
                {playback.title}
              </h2>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-neutral-300 font-mono truncate">
                <span className="uppercase text-[#d4ff00] font-extrabold">
                  {playback.source}
                </span>
                <span>&bull;</span>
                <span className="truncate">{playback.mimeType}</span>
                {stats.videoHeight > 0 && (
                  <>
                    <span>&bull;</span>
                    <span className="bg-white/20 px-1.5 py-0.2 rounded text-[10px]">
                      {stats.videoHeight}p
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {onToggleCinemaMode && (
              <button
                onClick={onToggleCinemaMode}
                title={isCinemaMode ? 'Exit Cinema Mode' : 'Cinema Mode'}
                className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg transition-colors text-gray-200"
              >
                <Tv className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
            <button
              onClick={() => setShowStatsModal(true)}
              title="Stream & Codec Information (VLC Media Info)"
              className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg transition-colors text-gray-200"
            >
              <Info className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Center Screen Big Play Icon Pulse (when paused) */}
      {!isPlaying && !isBuffering && !error && (
        <button
          onClick={togglePlay}
          className="absolute z-10 w-16 h-16 sm:w-20 sm:h-20 bg-[#d4ff00] hover:bg-[#c4ec00] text-black rounded-full flex items-center justify-center shadow-2xl shadow-lime-500/30 transition-transform hover:scale-110 active:scale-95"
        >
          <Play className="w-8 h-8 sm:w-10 sm:h-10 ml-1 fill-black text-black" />
        </button>
      )}

      {/* VLC Toolbar & Bottom Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-2 sm:p-4 transition-opacity duration-300 z-20 overflow-visible ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Timeline Scrub Bar */}
        <div
          ref={timelineRef}
          onPointerDown={handleTimelinePointerDown}
          onPointerMove={handleTimelinePointerMove}
          onPointerUp={handleTimelinePointerUp}
          onPointerCancel={handleTimelinePointerUp}
          onPointerLeave={handleTimelinePointerLeave}
          className="relative h-2 sm:h-2.5 bg-gray-700/60 rounded-full cursor-pointer mb-2.5 sm:mb-3 group/track hover:h-3 sm:hover:h-3.5 transition-all select-none"
        >
          {/* Buffered range */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-gray-500/50 rounded-full transition-all"
            style={{ width: `${bufferedPercent}%` }}
          />
          {/* Played progress */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-[#d4ff00] rounded-full shadow-[0_0_8px_rgba(212,255,0,0.5)]"
            style={{ width: `${progressPercent}%` }}
          >
            {/* Scrubber thumb knob */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-white border-2 border-[#d4ff00] rounded-full shadow-md scale-100 sm:scale-0 sm:group-hover/track:scale-100 transition-transform" />
          </div>

          {/* Hover / Scrub Time Preview Tooltip (Unobstructed & High-Contrast) */}
          {hoverTime !== null && (
            <div
              className="absolute -top-11 -translate-x-1/2 bg-neutral-900/95 backdrop-blur-md border border-[#d4ff00] text-[#d4ff00] text-xs font-mono font-black px-2.5 py-1 rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.85)] pointer-events-none z-50 select-none flex items-center gap-1"
              style={{ left: `${Math.min(96, Math.max(4, hoverPosition))}%` }}
            >
              <span>{formatTime(hoverTime)}</span>
              {/* Tooltip downward pointing arrow */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-neutral-900 border-r border-b border-[#d4ff00] rotate-45" />
            </div>
          )}
        </div>

        {/* Control Buttons Row */}
        <div className="flex items-center justify-between text-white gap-2">
          {/* Left Controls: Play/Pause, Volume, Time */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              onClick={togglePlay}
              className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg transition-colors text-white flex-shrink-0"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-white" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />}
            </button>

            {/* Quick Seek buttons (hidden on phone screens to prevent overflow, user scrubs on timeline) */}
            <button
              onClick={() => seekRelative(-10)}
              className="p-1.5 hover:bg-white/15 rounded-lg text-gray-300 hover:text-white transition-colors hidden sm:inline-flex"
              title="Rewind 10 seconds (Left Arrow)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => seekRelative(10)}
              className="p-1.5 hover:bg-white/15 rounded-lg text-gray-300 hover:text-white transition-colors hidden sm:inline-flex"
              title="Forward 10 seconds (Right Arrow)"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume slider & mute */}
            <div className="flex items-center gap-1 sm:gap-2 group/volume flex-shrink-0">
              <button
                onClick={toggleMute}
                className="p-1 sm:p-1.5 hover:bg-white/15 rounded-lg text-gray-200 transition-colors"
                title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="hidden md:inline-block w-16 sm:w-24 h-1.5 bg-neutral-700 accent-[#d4ff00] rounded-lg cursor-pointer"
              />
              <span className="hidden md:inline text-[11px] font-mono text-neutral-400 w-8">
                {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
              </span>
            </div>

            {/* High-Contrast Crystal-Clear VLC Time Display Badge */}
            <div
              onClick={() => setShowRemainingTime(!showRemainingTime)}
              title="Click to toggle elapsed / remaining time"
              className="shrink-0 flex items-center bg-black/80 hover:bg-black backdrop-blur-md px-2 sm:px-2.5 py-1 rounded-lg border border-white/20 hover:border-[#d4ff00]/60 text-xs font-mono shadow-md cursor-pointer transition-all select-none whitespace-nowrap"
            >
              <span className="text-[#d4ff00] font-black tracking-tight">{formatTime(currentTime)}</span>
              <span className="mx-1 text-white/40 font-bold">/</span>
              <span className="text-white font-bold tracking-tight">
                {showRemainingTime ? `-${formatTime(Math.max(0, duration - currentTime))}` : formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Right Controls: Subtitles, Speed, Qualities, PiP, Audio Boost, Fullscreen */}
          <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-2 relative flex-shrink-0">
            {/* Subtitle Selector */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSubtitleMenu(!showSubtitleMenu);
                  setShowSpeedMenu(false);
                  setShowQualityMenu(false);
                  setShowAudioMenu(false);
                  setShowSettingsMenu(false);
                }}
                className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                  activeSubtitleId
                    ? 'text-[#d4ff00] bg-[#d4ff00]/15 border border-[#d4ff00]/40'
                    : 'text-neutral-300 hover:text-white hover:bg-white/15'
                }`}
                title="Subtitles (C)"
              >
                <Subtitles className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Subtitle Menu Popup */}
              {showSubtitleMenu && (
                <div className="absolute bottom-11 right-0 w-64 max-w-[85vw] bg-bdstream-surface border border-bdstream-border rounded-xl shadow-2xl p-3 text-xs z-30">
                  <div className="font-semibold text-gray-200 mb-2 pb-1 border-b border-gray-700 flex justify-between items-center">
                    <span>Subtitles</span>
                    {activeSubtitleId && (
                      <button
                        onClick={() => selectSubtitle(null)}
                        className="text-red-400 text-[11px] hover:underline"
                      >
                        Turn Off
                      </button>
                    )}
                  </div>

                  <div className="space-y-1 max-h-40 overflow-y-auto mb-3">
                    {subtitles.length === 0 ? (
                      <p className="text-gray-400 text-[11px] py-1">No embedded subtitles found.</p>
                    ) : (
                      subtitles.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => selectSubtitle(sub)}
                          className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between ${
                            activeSubtitleId === sub.id
                              ? 'bg-[#d4ff00] text-black font-bold'
                              : 'text-gray-300 hover:bg-white/10'
                          }`}
                        >
                          <span className="truncate">{sub.label}</span>
                          {activeSubtitleId === sub.id && <Check className="w-3.5 h-3.5" />}
                        </button>
                      ))
                    )}
                  </div>

                  {/* Subtitle Delay Sync */}
                  {activeSubtitleId && (
                    <div className="mb-3 pt-2 border-t border-gray-700">
                      <div className="flex items-center justify-between text-neutral-400 text-[11px] mb-1">
                        <span>Sync Delay:</span>
                        <span className="font-mono text-[#d4ff00]">{subtitleDelay}ms</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        <button
                          onClick={() => adjustSubtitleDelay(-500)}
                          className="px-1 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px]"
                        >
                          -0.5s
                        </button>
                        <button
                          onClick={() => adjustSubtitleDelay(-100)}
                          className="px-1 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px]"
                        >
                          -0.1s
                        </button>
                        <button
                          onClick={() => adjustSubtitleDelay(100)}
                          className="px-1 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px]"
                        >
                          +0.1s
                        </button>
                        <button
                          onClick={() => adjustSubtitleDelay(500)}
                          className="px-1 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px]"
                        >
                          +0.5s
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Load External Subtitle File */}
                  <label className="block w-full text-center py-1.5 px-2 bg-white/5 hover:bg-white/10 border border-gray-700 rounded cursor-pointer text-gray-300 text-[11px] transition-colors">
                    <span>+ Load External SRT / VTT</span>
                    <input
                      type="file"
                      accept=".srt,.vtt"
                      onChange={handleCustomSubtitleUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Audio Track Selector */}
            {audioTracks.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowAudioMenu(!showAudioMenu);
                    setShowSubtitleMenu(false);
                    setShowSpeedMenu(false);
                    setShowQualityMenu(false);
                    setShowSettingsMenu(false);
                  }}
                  className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                    showAudioMenu ? 'text-[#d4ff00] bg-white/10' : 'text-neutral-300 hover:text-white hover:bg-white/15'
                  }`}
                  title="Audio Language / Tracks"
                >
                  <Headphones className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {showAudioMenu && (
                  <div className="absolute bottom-11 right-0 w-48 max-w-[85vw] bg-bdstream-surface border border-bdstream-border rounded-xl shadow-2xl p-2 text-xs z-30">
                    <div className="font-semibold text-gray-400 px-2 py-1 text-[10px] uppercase border-b border-gray-700 mb-1">
                      Audio Tracks
                    </div>
                    {audioTracks.map((t, idx) => (
                      <button
                        key={t.id}
                        onClick={() => switchAudioTrack(idx)}
                        className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between ${
                          t.enabled ? 'bg-[#d4ff00] text-black font-bold' : 'text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        <span className="truncate">{t.label || `Track ${idx + 1}`} {t.language ? `(${t.language})` : ''}</span>
                        {t.enabled && <Check className="w-3 h-3 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Playback Speed Selector */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSpeedMenu(!showSpeedMenu);
                  setShowSubtitleMenu(false);
                  setShowQualityMenu(false);
                  setShowAudioMenu(false);
                  setShowSettingsMenu(false);
                }}
                className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-[11px] sm:text-xs font-mono font-semibold text-gray-300 hover:text-white hover:bg-white/15 transition-colors"
                title="Playback Speed ([ and ])"
              >
                {playbackSpeed}x
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-11 right-0 w-32 max-w-[80vw] bg-bdstream-surface border border-bdstream-border rounded-xl shadow-2xl p-1 text-xs z-30">
                  <div className="font-semibold text-gray-400 px-2 py-1 text-[10px] uppercase">
                    Speed
                  </div>
                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => changeSpeed(s)}
                      className={`w-full text-left px-2 py-1 rounded flex items-center justify-between ${
                        playbackSpeed === s
                          ? 'bg-[#d4ff00] text-black font-bold'
                          : 'text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      <span>{s}x</span>
                      {playbackSpeed === s && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Alternate Qualities (Only if source provides multiple) */}
            {playback.availableQualities && playback.availableQualities.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowQualityMenu(!showQualityMenu);
                    setShowSpeedMenu(false);
                    setShowSubtitleMenu(false);
                    setShowAudioMenu(false);
                    setShowSettingsMenu(false);
                  }}
                  className="p-1.5 hover:bg-white/15 rounded-lg text-gray-300 hover:text-white transition-colors"
                  title="Video Quality"
                >
                  <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                {showQualityMenu && (
                  <div className="absolute bottom-11 right-0 w-36 max-w-[80vw] bg-bdstream-surface border border-bdstream-border rounded-xl shadow-2xl p-1 text-xs z-30">
                    <div className="font-semibold text-gray-400 px-2 py-1 text-[10px] uppercase">
                      Stream Quality
                    </div>
                    {playback.availableQualities.map((q) => (
                      <button
                        key={q}
                        className="w-full text-left px-2 py-1 rounded text-gray-300 hover:bg-white/10 flex items-center justify-between"
                      >
                        <span>{q}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Player Settings Menu Dropdown (Settings icon no longer pops out PiP window) */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSettingsMenu(!showSettingsMenu);
                  setShowSpeedMenu(false);
                  setShowSubtitleMenu(false);
                  setShowQualityMenu(false);
                  setShowAudioMenu(false);
                }}
                className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                  showSettingsMenu
                    ? 'text-[#d4ff00] bg-white/15 ring-1 ring-[#d4ff00]/40'
                    : 'text-gray-300 hover:text-white hover:bg-white/15'
                }`}
                title="Playback Settings"
              >
                <SettingsIcon
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 ${
                    showSettingsMenu ? 'rotate-45 text-[#d4ff00]' : ''
                  }`}
                />
              </button>

              {showSettingsMenu && (
                <div className="absolute bottom-11 right-0 w-64 max-w-[85vw] bg-bdstream-surface border border-bdstream-border rounded-xl shadow-2xl p-2.5 text-xs z-30 divide-y divide-gray-700/60 backdrop-blur-md">
                  <div className="font-semibold text-gray-200 pb-2 px-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold text-white text-[12px]">
                      <SettingsIcon className="w-3.5 h-3.5 text-[#d4ff00]" />
                      Player Settings
                    </span>
                  </div>

                  {/* Playback Speed */}
                  <div className="py-2 px-1">
                    <div className="text-[11px] font-medium text-gray-400 mb-1.5 flex justify-between items-center">
                      <span>Playback Speed</span>
                      <span className="font-mono text-[#d4ff00] font-bold">{playbackSpeed}x</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[0.5, 1, 1.25, 1.5].map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            changeSpeed(s);
                            setShowSettingsMenu(false);
                          }}
                          className={`py-1 rounded text-center text-[10px] font-mono transition-colors ${
                            playbackSpeed === s
                              ? 'bg-[#d4ff00] text-black font-extrabold shadow-sm'
                              : 'bg-white/5 hover:bg-white/15 text-gray-300'
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Audio Boost Toggle */}
                  <div className="py-2 px-1 flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium text-[11px]">Audio Boost (250%)</div>
                      <div className="text-[10px] text-gray-400">Dialogue & Stereo Enhancer</div>
                    </div>
                    <button
                      onClick={toggleAudioBoost}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                        audioBoost
                          ? 'bg-[#d4ff00] text-black shadow-md shadow-lime-500/20'
                          : 'bg-white/10 hover:bg-white/20 text-gray-300'
                      }`}
                    >
                      {audioBoost ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Picture-in-Picture Option */}
                  <div className="py-2 px-1">
                    <button
                      onClick={() => {
                        togglePiP();
                        setShowSettingsMenu(false);
                      }}
                      className="w-full flex items-center justify-between text-left px-2 py-1.5 rounded hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                    >
                      <span className="flex items-center gap-2 text-[11px]">
                        <PictureInPicture2 className="w-3.5 h-3.5 text-gray-400" />
                        Picture-in-Picture
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">Pop-out</span>
                    </button>
                  </div>

                  {/* Media & Codec Information */}
                  <div className="pt-2 px-1">
                    <button
                      onClick={() => {
                        setShowStatsModal(true);
                        setShowSettingsMenu(false);
                      }}
                      className="w-full flex items-center justify-between text-left px-2 py-1.5 rounded hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                    >
                      <span className="flex items-center gap-2 text-[11px]">
                        <Info className="w-3.5 h-3.5 text-gray-400" />
                        Media Information
                      </span>
                      <span className="text-[10px] text-[#d4ff00] font-mono">Codec Info</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Picture in Picture dedicated button (with real PiP icon, hidden on small mobile) */}
            <button
              onClick={togglePiP}
              className="p-1.5 sm:p-2 hover:bg-white/15 rounded-lg text-gray-300 hover:text-white transition-colors hidden sm:block"
              title="Picture in Picture (P)"
            >
              <PictureInPicture2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Audio Boost (Web Audio Dialogue & 5.1 Stereo Booster) */}
            <button
              onClick={toggleAudioBoost}
              className={`p-1.5 sm:p-2 rounded-lg transition-all flex items-center gap-1 text-xs font-semibold ${
                audioBoost
                  ? 'text-black bg-[#d4ff00] font-extrabold shadow-lg shadow-lime-500/30 ring-1 ring-lime-400'
                  : 'text-gray-300 hover:text-white hover:bg-white/15'
              }`}
              title={audioBoost ? 'Audio Boost: ON (250% + Stereo Dialogue Enhanced)' : 'Audio Boost: OFF (Click to boost low audio / dialogue)'}
            >
              <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden lg:inline font-mono text-[11px] font-bold">
                {audioBoost ? 'Boost 250%' : 'Audio Boost'}
              </span>
            </button>

            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 sm:p-2 hover:bg-white/15 rounded-lg text-white transition-colors"
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* VLC Codec & Stream Information Modal */}
      {showStatsModal && (
        <div className="absolute inset-0 bg-black/80 z-40 flex items-center justify-center p-4">
          <div className="bg-bdstream-card border border-bdstream-border max-w-md w-full rounded-xl p-5 shadow-2xl text-xs text-gray-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-700 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#d4ff00] rounded-sm" />
                <h4 className="font-bold text-sm text-white">VLC Media Information</h4>
              </div>
              <button
                onClick={() => setShowStatsModal(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                &times;
              </button>
            </div>

            <div className="space-y-2 font-mono">
              <div className="flex justify-between py-1 border-b border-gray-800">
                <span className="text-gray-400">Stream Title:</span>
                <span className="text-white truncate max-w-[220px]">{playback.title}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800">
                <span className="text-gray-400">Media Source:</span>
                <span className="text-[#d4ff00] uppercase font-bold">{playback.source}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800">
                <span className="text-gray-400">Resolution:</span>
                <span>{stats.videoWidth ? `${stats.videoWidth} x ${stats.videoHeight}` : 'Probing...'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800">
                <span className="text-gray-400">Content MIME:</span>
                <span>{playback.mimeType}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800">
                <span className="text-gray-400">Range Requests:</span>
                <span className={playback.supportsRangeRequests ? 'text-emerald-400' : 'text-yellow-400'}>
                  {playback.supportsRangeRequests ? 'HTTP 206 Partial Content' : 'Standard'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800">
                <span className="text-gray-400">Estimated Size:</span>
                <span>
                  {playback.sizeBytes
                    ? `${(playback.sizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
                    : 'Streamed'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800">
                <span className="text-gray-400">Buffer Health:</span>
                <span>{bufferedPercent.toFixed(1)}% loaded</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Subtitles Attached:</span>
                <span>{subtitles.length} track(s)</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-700 flex justify-end">
              <button
                onClick={() => setShowStatsModal(false)}
                className="px-4 py-1.5 bg-[#d4ff00] hover:bg-[#c4ec00] text-black font-extrabold rounded-full transition-colors shadow-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
