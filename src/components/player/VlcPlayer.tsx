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
  Check
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

  // Dropdowns & panels
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  // Stream stats
  const [stats, setStats] = useState({
    videoWidth: 0,
    videoHeight: 0,
    decodedFrames: 0,
    droppedFrames: 0
  });

  // Resume notification state
  const [resumePrompt, setResumePrompt] = useState<{ time: number } | null>(null);

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
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
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

    // Check saved progress
    const saved = StorageService.getProgress(playback.itemId);
    if (saved && saved.currentTime > 10 && saved.currentTime < (saved.duration - 20)) {
      setResumePrompt({ time: saved.currentTime });
    } else if (initialTime > 0) {
      video.currentTime = initialTime;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
      if (subtitleBlobUrl) {
        URL.revokeObjectURL(subtitleBlobUrl);
      }
    };
  }, [playback, useDirectStream]);

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
      }, 3000);
    }
  }, [isPlaying]);

  const handleMouseMove = () => {
    resetControlsTimer();
  };

  // 3. Play / Pause toggle
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

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
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !videoRef.current || duration === 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pos = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const targetTime = pos * duration;
    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || duration === 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pos = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    setHoverPosition(pos * 100);
    setHoverTime(pos * duration);
  };

  const handleTimelineMouseLeave = () => {
    setHoverTime(null);
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
      source: playback.source,
      lastWatchedAt: new Date().toISOString()
    };
    StorageService.saveProgress(progress);
  };

  const onWaitingHandler = () => setIsBuffering(true);
  const onPlayingHandler = () => {
    setIsBuffering(false);
    setIsPlaying(true);
  };
  const onPauseHandler = () => setIsPlaying(false);
  const onEndedHandler = () => {
    setIsPlaying(false);
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

  // Resume playback action
  const applyResume = () => {
    if (resumePrompt && videoRef.current) {
      videoRef.current.currentTime = resumePrompt.time;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      setResumePrompt(null);
    }
  };

  const dismissResume = () => {
    setResumePrompt(null);
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
            <div className="w-12 h-12 border-4 border-vlc-orange border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono text-gray-300">Buffering Stream...</span>
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
                className="px-4 py-2 bg-vlc-orange hover:bg-vlc-darkOrange text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
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

      {/* Resume Playing Toast */}
      {resumePrompt && (
        <div className="absolute top-4 left-4 z-20 bg-bdstream-surface/95 border border-vlc-orange/50 text-white p-3 rounded-lg shadow-xl backdrop-blur-md flex items-center gap-4 animate-fade-in">
          <div>
            <p className="text-xs font-medium text-vlc-orange uppercase tracking-wider">Resume Playback</p>
            <p className="text-sm text-gray-200">
              Continue from <span className="font-mono font-semibold">{formatTime(resumePrompt.time)}</span>?
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={applyResume}
              className="px-3 py-1 bg-vlc-orange hover:bg-vlc-darkOrange text-white text-xs font-semibold rounded transition-colors"
            >
              Resume
            </button>
            <button
              onClick={dismissResume}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-gray-300 text-xs rounded transition-colors"
            >
              Start Over
            </button>
          </div>
        </div>
      )}

      {/* Top Bar (Title & Technical Info button) */}
      <div
        className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between text-white transition-opacity duration-300 z-20 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/15 rounded-md transition-colors"
              title="Back"
            >
              &larr; Back
            </button>
          )}
          <div>
            <h2 className="text-base font-semibold text-white drop-shadow truncate max-w-xl">
              {playback.title}
            </h2>
            <div className="flex items-center gap-2 text-xs text-gray-300 font-mono">
              <span className="uppercase text-vlc-orange font-bold">
                {playback.source}
              </span>
              <span>&bull;</span>
              <span>{playback.mimeType}</span>
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

        <div className="flex items-center gap-2">
          {onToggleCinemaMode && (
            <button
              onClick={onToggleCinemaMode}
              title={isCinemaMode ? 'Exit Cinema Mode' : 'Cinema Mode'}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-gray-200"
            >
              <Tv className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setShowStatsModal(true)}
            title="Stream & Codec Information (VLC Media Info)"
            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-gray-200"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Screen Big Play Icon Pulse (when paused) */}
      {!isPlaying && !isBuffering && !error && (
        <button
          onClick={togglePlay}
          className="absolute z-10 w-20 h-20 bg-vlc-orange/90 hover:bg-vlc-orange text-white rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95"
        >
          <Play className="w-10 h-10 ml-1 fill-white" />
        </button>
      )}

      {/* VLC Toolbar & Bottom Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-4 transition-opacity duration-300 z-20 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Timeline Scrub Bar */}
        <div
          ref={timelineRef}
          onClick={handleTimelineClick}
          onMouseMove={handleTimelineMouseMove}
          onMouseLeave={handleTimelineMouseLeave}
          className="relative h-2 bg-gray-700/60 rounded-full cursor-pointer mb-3 group/track hover:h-3 transition-all"
        >
          {/* Buffered range */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-gray-500/50 rounded-full transition-all"
            style={{ width: `${bufferedPercent}%` }}
          />
          {/* Played progress */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-vlc-orange rounded-full"
            style={{ width: `${progressPercent}%` }}
          >
            {/* Scrubber thumb knob */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-vlc-orange rounded-full shadow-md scale-0 group-hover/track:scale-100 transition-transform" />
          </div>

          {/* Hover Time Preview Tooltip */}
          {hoverTime !== null && (
            <div
              className="absolute -top-7 -translate-x-1/2 bg-gray-900 border border-gray-700 text-white text-[11px] font-mono px-2 py-0.5 rounded shadow pointer-events-none"
              style={{ left: `${hoverPosition}%` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        {/* Control Buttons Row */}
        <div className="flex items-center justify-between text-white">
          {/* Left Controls: Play/Pause, Seek buttons, Volume, Time */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
            </button>

            {/* Quick Seek buttons */}
            <button
              onClick={() => seekRelative(-10)}
              className="p-1.5 hover:bg-white/15 rounded-lg text-gray-300 hover:text-white transition-colors"
              title="Rewind 10 seconds (Left Arrow)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => seekRelative(10)}
              className="p-1.5 hover:bg-white/15 rounded-lg text-gray-300 hover:text-white transition-colors"
              title="Forward 10 seconds (Right Arrow)"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume slider & mute */}
            <div className="flex items-center gap-2 group/volume">
              <button
                onClick={toggleMute}
                className="p-1.5 hover:bg-white/15 rounded-lg text-gray-200 transition-colors"
                title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-red-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-16 sm:w-24 h-1.5 bg-gray-700 accent-vlc-orange rounded-lg cursor-pointer"
              />
              <span className="text-[11px] font-mono text-gray-400 w-8">
                {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
              </span>
            </div>

            {/* VLC Time Display (Click to toggle remaining time) */}
            <div
              onClick={() => setShowRemainingTime(!showRemainingTime)}
              title="Click to toggle remaining time"
              className="text-xs font-mono text-gray-300 cursor-pointer hover:text-vlc-orange transition-colors select-none"
            >
              <span>{formatTime(currentTime)}</span>
              <span className="mx-1 text-gray-500">/</span>
              <span>
                {showRemainingTime ? `-${formatTime(Math.max(0, duration - currentTime))}` : formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Right Controls: Subtitles, Speed, Qualities, PiP, Fullscreen */}
          <div className="flex items-center gap-2 relative">
            {/* Subtitle Selector */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSubtitleMenu(!showSubtitleMenu);
                  setShowSpeedMenu(false);
                  setShowQualityMenu(false);
                }}
                className={`p-2 rounded-lg transition-colors ${
                  activeSubtitleId
                    ? 'text-vlc-orange bg-vlc-orange/20 border border-vlc-orange/40'
                    : 'text-gray-300 hover:text-white hover:bg-white/15'
                }`}
                title="Subtitles (C)"
              >
                <Subtitles className="w-5 h-5" />
              </button>

              {/* Subtitle Menu Popup */}
              {showSubtitleMenu && (
                <div className="absolute bottom-10 right-0 w-64 bg-bdstream-surface border border-bdstream-border rounded-xl shadow-2xl p-3 text-xs z-30">
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
                              ? 'bg-vlc-orange text-white'
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
                      <div className="flex items-center justify-between text-gray-400 text-[11px] mb-1">
                        <span>Sync Delay:</span>
                        <span className="font-mono text-vlc-orange">{subtitleDelay}ms</span>
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

            {/* Playback Speed Selector */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSpeedMenu(!showSpeedMenu);
                  setShowSubtitleMenu(false);
                  setShowQualityMenu(false);
                }}
                className="px-2 py-1 rounded text-xs font-mono font-semibold text-gray-300 hover:text-white hover:bg-white/15 transition-colors"
                title="Playback Speed ([ and ])"
              >
                {playbackSpeed}x
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-10 right-0 w-32 bg-bdstream-surface border border-bdstream-border rounded-xl shadow-2xl p-1 text-xs z-30">
                  <div className="font-semibold text-gray-400 px-2 py-1 text-[10px] uppercase">
                    Speed
                  </div>
                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => changeSpeed(s)}
                      className={`w-full text-left px-2 py-1 rounded flex items-center justify-between ${
                        playbackSpeed === s
                          ? 'bg-vlc-orange text-white'
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
                  }}
                  className="p-1.5 hover:bg-white/15 rounded-lg text-gray-300 hover:text-white transition-colors"
                  title="Video Quality"
                >
                  <Sliders className="w-4 h-4" />
                </button>
                {showQualityMenu && (
                  <div className="absolute bottom-10 right-0 w-36 bg-bdstream-surface border border-bdstream-border rounded-xl shadow-2xl p-1 text-xs z-30">
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

            {/* Picture in Picture */}
            <button
              onClick={togglePiP}
              className="p-2 hover:bg-white/15 rounded-lg text-gray-300 hover:text-white transition-colors hidden sm:block"
              title="Picture in Picture"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>

            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white/15 rounded-lg text-white transition-colors"
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
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
                <div className="w-3 h-3 bg-vlc-orange rounded-sm" />
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
                <span className="text-vlc-orange uppercase">{playback.source}</span>
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
                className="px-4 py-1.5 bg-vlc-orange text-white rounded font-medium hover:bg-vlc-darkOrange transition-colors"
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
