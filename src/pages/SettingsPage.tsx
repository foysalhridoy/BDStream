import React from 'react';
import {
  Keyboard,
  Subtitles,
  Gauge
} from 'lucide-react';
import { PlayerSettings } from '../types/media';
import { StorageService } from '../services/storage';

interface SettingsPageProps {
  settings: PlayerSettings;
  onUpdateSettings: (newSettings: PlayerSettings) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onUpdateSettings
}) => {

  const handleSpeedChange = (speed: number) => {
    const updated = StorageService.saveSettings({ defaultSpeed: speed });
    onUpdateSettings(updated);
  };

  const handleResumeToggle = (val: boolean) => {
    const updated = StorageService.saveSettings({ resumePlayback: val });
    onUpdateSettings(updated);
  };

  const handleSubtitleSize = (size: 'small' | 'medium' | 'large') => {
    const updated = StorageService.saveSettings({ subtitleSize: size });
    onUpdateSettings(updated);
  };

  return (
    <div className="pb-16 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#d4ff00] animate-pulse shrink-0" />
          Platform <span className="bg-[#d4ff00] text-black px-2.5 py-0.5 rounded-lg font-black">Settings</span>
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Customize your BDStream player experience, subtitles, and playback preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Playback Preferences */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl sm:rounded-3xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <Gauge className="w-5 h-5 text-neutral-800" />
            Playback Defaults
          </h2>

          <div className="space-y-5 text-sm">
            {/* Default Playback Speed */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-200">
              <div>
                <p className="font-semibold text-neutral-900">Default Playback Speed</p>
                <p className="text-xs text-neutral-500">Preferred rate when starting a video</p>
              </div>
              <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-full border border-neutral-200 font-mono text-xs">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSpeedChange(s)}
                    className={`px-3 py-1 rounded-full transition-colors ${
                      settings.defaultSpeed === s
                        ? 'bg-[#d4ff00] text-black font-black shadow-sm'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Auto Resume Playback */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
              <div>
                <p className="font-semibold text-neutral-900">Resume Watch Progress</p>
                <p className="text-xs text-neutral-500">Remember playback position for unfinished media</p>
              </div>
              <button
                onClick={() => handleResumeToggle(!settings.resumePlayback)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.resumePlayback ? 'bg-[#d4ff00]' : 'bg-neutral-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full shadow-sm ${
                    settings.resumePlayback ? 'translate-x-6 bg-black' : 'translate-x-1 bg-white'
                  } transition-transform`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Subtitles Customization */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl sm:rounded-3xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <Subtitles className="w-5 h-5 text-neutral-800" />
            Subtitle Preferences
          </h2>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
            <div>
              <p className="font-semibold text-neutral-900">Subtitle Font Size</p>
              <p className="text-xs text-neutral-500">Rendering size for embedded and loaded tracks</p>
            </div>
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-full border border-neutral-200 text-xs">
              {(['small', 'medium', 'large'] as const).map((sz) => (
                <button
                  key={sz}
                  onClick={() => handleSubtitleSize(sz)}
                  className={`px-3.5 py-1.5 rounded-full capitalize transition-colors ${
                    settings.subtitleSize === sz
                      ? 'bg-[#d4ff00] text-black font-black shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Reference */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl sm:rounded-3xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-neutral-800" />
            BDStream Player Keyboard Shortcuts
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-neutral-600">Play / Pause</span>
              <kbd className="px-2 py-1 bg-white text-neutral-900 rounded border border-neutral-200 shadow-2xs font-semibold">Space</kbd>
            </div>
            <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-neutral-600">Seek 5s Forward / Back</span>
              <kbd className="px-2 py-1 bg-white text-neutral-900 rounded border border-neutral-200 shadow-2xs font-semibold">&larr; / &rarr;</kbd>
            </div>
            <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-neutral-600">Seek 30s Forward / Back</span>
              <kbd className="px-2 py-1 bg-white text-neutral-900 rounded border border-neutral-200 shadow-2xs font-semibold">Shift + &larr; / &rarr;</kbd>
            </div>
            <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-neutral-600">Volume Up / Down (5%)</span>
              <kbd className="px-2 py-1 bg-white text-neutral-900 rounded border border-neutral-200 shadow-2xs font-semibold">&uarr; / &darr;</kbd>
            </div>
            <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-neutral-600">Toggle Fullscreen</span>
              <kbd className="px-2 py-1 bg-white text-neutral-900 rounded border border-neutral-200 shadow-2xs font-semibold">F</kbd>
            </div>
            <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-neutral-600">Mute / Unmute</span>
              <kbd className="px-2 py-1 bg-white text-neutral-900 rounded border border-neutral-200 shadow-2xs font-semibold">M</kbd>
            </div>
            <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-neutral-600">Toggle Subtitles</span>
              <kbd className="px-2 py-1 bg-white text-neutral-900 rounded border border-neutral-200 shadow-2xs font-semibold">C</kbd>
            </div>
            <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-neutral-600">Speed Down / Up</span>
              <kbd className="px-2 py-1 bg-white text-neutral-900 rounded border border-neutral-200 shadow-2xs font-semibold">[ / ]</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
