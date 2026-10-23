import React, { useState } from 'react';
import { Activity, Server, Wifi, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Shield, Info, ArrowUpRight } from 'lucide-react';
import { SourceHealth } from '../types/media';

interface DiagnosticsPageProps {
  sourcesHealth: Record<string, SourceHealth> | null;
  onRefreshHealth: () => void;
}

export const DiagnosticsPage: React.FC<DiagnosticsPageProps> = ({
  sourcesHealth,
  onRefreshHealth
}) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefreshHealth();
    setTimeout(() => setRefreshing(false), 500);
  };

  const df = sourcesHealth?.dhakaflix;
  const icc = sourcesHealth?.icc;

  return (
    <div className="pb-16 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-vlc-orange" />
            Source Diagnostics & Network Health
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Real-time inspection of local ISP media portals and storage clusters
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-bdstream-surface hover:bg-white/10 border border-bdstream-border text-white text-xs font-semibold rounded-xl flex items-center gap-2 self-start sm:self-auto transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Run Connection Diagnostics
        </button>
      </div>

      {/* Diagnostics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DhakaFlix Diagnostics */}
        <div className="bg-bdstream-card border border-bdstream-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-white text-base">DhakaFlix Portal</h2>
                  <span className="font-mono text-xs text-gray-400">http://172.16.50.4/</span>
                </div>
              </div>
              {df?.isAccessible ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Online
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
                  <XCircle className="w-3.5 h-3.5" />
                  Unreachable
                </span>
              )}
            </div>

            <div className="space-y-2.5 text-xs font-mono bg-bdstream-surface p-4 rounded-xl border border-bdstream-border mb-4">
              <div className="flex justify-between py-1 border-b border-gray-800">
                <span className="text-gray-400">Gateway Status:</span>
                <span className={df?.isAccessible ? 'text-emerald-400' : 'text-red-400'}>
                  {df?.isAccessible ? '200 OK (nginx/1.20.1)' : 'Offline'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800">
                <span className="text-gray-400">Response Latency:</span>
                <span className="text-white">{df?.latencyMs ?? 0} ms</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800">
                <span className="text-gray-400">Storage Architecture:</span>
                <span className="text-gray-200">h5ai Directory Clusters</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800">
                <span className="text-gray-400">Storage Nodes:</span>
                <span className="text-gray-200">172.16.50.7, 172.16.50.14, .12, .10</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800">
                <span className="text-gray-400">Streaming Mode:</span>
                <span className="text-emerald-400">Direct HTTP 206 Byte-Range</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Session Required:</span>
                <span className="text-gray-300">No (Open ISP Portal)</span>
              </div>
            </div>

            <p className="text-xs text-gray-400">
              {df?.message || 'Reachable on local network.'}
            </p>
          </div>

          <div className="pt-4 border-t border-bdstream-border mt-4">
            <a
              href="http://172.16.50.4/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-vlc-orange font-semibold hover:underline"
            >
              Open DhakaFlix Portal Directly <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* ICC Media Portal Diagnostics */}
        <div className="bg-bdstream-card border border-bdstream-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                  <Wifi className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-white text-base">ICC Media Portal</h2>
                  <span className="font-mono text-xs text-gray-400">http://10.16.100.244/</span>
                </div>
              </div>
              {icc?.isAccessible ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Auth Required
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
                  <XCircle className="w-3.5 h-3.5" />
                  Unreachable
                </span>
              )}
            </div>

            <div className="space-y-2.5 text-xs font-mono bg-bdstream-surface p-4 rounded-xl border border-bdstream-border mb-4">
              <div className="flex justify-between py-1 border-b border-gray-800">
                <span className="text-gray-400">Host Accessibility:</span>
                <span className={icc?.isAccessible ? 'text-emerald-400' : 'text-red-400'}>
                  {icc?.isAccessible ? 'Reachable (Apache/2.4)' : 'Offline'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800">
                <span className="text-gray-400">Response Latency:</span>
                <span className="text-white">{icc?.latencyMs ?? 0} ms</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800">
                <span className="text-gray-400">Firewall Redirection:</span>
                <span className="text-yellow-400">302 to notice.html / vfw.php</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800">
                <span className="text-gray-400">Auth Mechanism:</span>
                <span className="text-yellow-400">PHP Session / Subscriber Token</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Active Session Configured:</span>
                <span className={icc?.sessionValid ? 'text-emerald-400' : 'text-red-400'}>
                  {icc?.sessionValid ? 'Active & Valid' : 'No Active Session'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-300">
              <div className="flex items-center gap-1.5 font-semibold text-white mb-1">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                Technical Restriction Notice
              </div>
              ICC Media Portal enforces subscriber-level firewall captive authentication. Unauthenticated requests are redirected. If you are an ICC subscriber, enter your session token in Settings to enable ICC catalog aggregation.
            </div>
          </div>

          <div className="pt-4 border-t border-bdstream-border mt-4">
            <a
              href="http://10.16.100.244/login.php"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-400 font-semibold hover:underline"
            >
              Open ICC Portal Login Page <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Security & SSRF Protection Banner */}
      <div className="bg-bdstream-card border border-bdstream-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white mb-1">
              Active Security Guardrails
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              BDStream enforces a strict server-side request forgery (SSRF) policy. Only explicitly configured RFC1918 private IP addresses for DhakaFlix and ICC are permitted by the media relay gateway. Arbitrary internal network probing, localhost loopback addresses (127.0.0.1), and cloud metadata endpoints (169.254.169.254) are strictly rejected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
