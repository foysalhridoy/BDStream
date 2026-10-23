import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Keyboard,
  KeyRound,
  Save,
  Subtitles,
  Gauge
} from 'lucide-react';
import { PlayerSettings } from '../types/media';
import { StorageService } from '../services/storage';
import { ApiService } from '../services/api';

interface SettingsPageProps {
  settings: PlayerSettings;
  onUpdateSettings: (newSettings: PlayerSettings) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onUpdateSettings
}) => {
  const [iccToken, setIccToken] = useState(settings.iccSessionToken || '');
  const [savingToken, setSavingToken] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<string | null>(null);

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

  const handleSaveIccToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingToken(true);
    setTokenStatus(null);
    try {
      const health = await ApiService.saveIccSession(iccToken);
      StorageService.saveSettings({ iccSessionToken: iccToken });
      setTokenStatus(
        health.sessionValid
          ? 'Session token validated successfully!'
          : 'Token saved, but verification failed at ICC portal. Ensure your session has not expired.'
      );
    } catch (err: unknown) {
      setTokenStatus(`Error: ${(err as Error).message}`);
    } finally {
      setSavingToken(false);
    }
  };

  return (
    <div className="pb-16 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <SettingsIcon className="w-7 h-7 text-vlc-orange" />
          Platform Settings
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Customize your player experience, credentials, and playback preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Playback Preferences */}
        <div className="bg-bdstream-card border border-bdstream-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Gauge className="w-5 h-5 text-vlc-orange" />
            Playback Defaults
          </h2>

          <div className="space-y-5 text-sm">
            {/* Default Playback Speed */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-bdstream-border">
              <div>
                <p className="font-semibold text-gray-200">Default Playback Speed</p>
                <p className="text-xs text-gray-400">Preferred rate when starting a video</p>
              </div>
              <div className="flex items-center gap-1 bg-bdstream-surface p-1 rounded-xl border border-bdstream-border font-mono text-xs">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSpeedChange(s)}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      settings.defaultSpeed === s
                        ? 'bg-vlc-orange text-white font-bold'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Auto Resume Playback */}
            <div className="flex items-center justify-between pb-4 border-b border-bdstream-border">
              <div>
                <p className="font-semibold text-gray-200">Resume Watch Progress</p>
                <p className="text-xs text-gray-400">Remember playback position for unfinished media</p>
              </div>
              <button
                onClick={() => handleResumeToggle(!settings.resumePlayback)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.resumePlayback ? 'bg-vlc-orange' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.resumePlayback ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Subtitles Customization */}
        <div className="bg-bdstream-card border border-bdstream-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Subtitles className="w-5 h-5 text-vlc-orange" />
            Subtitle Preferences
          </h2>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
            <div>
              <p className="font-semibold text-gray-200">Subtitle Font Size</p>
              <p className="text-xs text-gray-400">Rendering size for embedded and loaded tracks</p>
            </div>
            <div className="flex items-center gap-1 bg-bdstream-surface p-1 rounded-xl border border-bdstream-border text-xs">
              {(['small', 'medium', 'large'] as const).map((sz) => (
                <button
                  key={sz}
                  onClick={() => handleSubtitleSize(sz)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                    settings.subtitleSize === sz
                      ? 'bg-vlc-orange text-white font-semibold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ICC Subscriber Session Key */}
        <div className="bg-bdstream-card border border-bdstream-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-blue-400" />
            ICC Portal Subscriber Authentication
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            If your broadband connection is on the ICC network, you can input your active subscriber session token to browse and stream from the ICC catalog.
          </p>

          <form onSubmit={handleSaveIccToken} className="space-y-3">
            <div>
              <label className="block text-xs font-mono text-gray-300 mb-1">
                ICC Session Token (e.g. from dashboard.php?session=...)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Paste your session token here..."
                  value={iccToken}
                  onChange={(e) => setIccToken(e.target.value)}
                  className="flex-1 bg-bdstream-surface border border-bdstream-border text-sm text-gray-200 placeholder-gray-600 rounded-xl px-3.5 py-2 focus:outline-none focus:border-vlc-orange"
                />
                <button
                  type="submit"
                  disabled={savingToken || !iccToken.trim()}
                  className="px-5 py-2 bg-vlc-orange hover:bg-vlc-darkOrange text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {savingToken ? 'Validating...' : 'Save & Validate'}
                </button>
              </div>
            </div>

            {tokenStatus && (
              <p className="text-xs font-mono text-amber-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                {tokenStatus}
              </p>
            )}
          </form>
        </div>

        {/* Keyboard Shortcuts Reference */}
        <div className="bg-bdstream-card border border-bdstream-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-vlc-orange" />
            VLC Player Keyboard Shortcuts
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="flex items-center justify-between p-2.5 bg-bdstream-surface rounded-xl border border-bdstream-border">
              <span className="text-gray-400">Play / Pause</span>
              <kbd className="px-2 py-1 bg-gray-800 text-white rounded border border-gray-700">Space</kbd>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-bdstream-surface rounded-xl border border-bdstream-border">
              <span className="text-gray-400">Seek 5s Forward / Back</span>
              <kbd className="px-2 py-1 bg-gray-800 text-white rounded border border-gray-700">&larr; / &rarr;</kbd>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-bdstream-surface rounded-xl border border-bdstream-border">
              <span className="text-gray-400">Seek 30s Forward / Back</span>
              <kbd className="px-2 py-1 bg-gray-800 text-white rounded border border-gray-700">Shift + &larr; / &rarr;</kbd>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-bdstream-surface rounded-xl border border-bdstream-border">
              <span className="text-gray-400">Volume Up / Down (5%)</span>
              <kbd className="px-2 py-1 bg-gray-800 text-white rounded border border-gray-700">&uarr; / &darr;</kbd>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-bdstream-surface rounded-xl border border-bdstream-border">
              <span className="text-gray-400">Toggle Fullscreen</span>
              <kbd className="px-2 py-1 bg-gray-800 text-white rounded border border-gray-700">F</kbd>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-bdstream-surface rounded-xl border border-bdstream-border">
              <span className="text-gray-400">Mute / Unmute</span>
              <kbd className="px-2 py-1 bg-gray-800 text-white rounded border border-gray-700">M</kbd>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-bdstream-surface rounded-xl border border-bdstream-border">
              <span className="text-gray-400">Toggle Subtitles</span>
              <kbd className="px-2 py-1 bg-gray-800 text-white rounded border border-gray-700">C</kbd>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-bdstream-surface rounded-xl border border-bdstream-border">
              <span className="text-gray-400">Speed Down / Up</span>
              <kbd className="px-2 py-1 bg-gray-800 text-white rounded border border-gray-700">[ / ]</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
