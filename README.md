# BDStream 🎬
### Unified ISP Media Streaming Platform with a VLC-Inspired Web Player

BDStream is a high-performance web platform designed to aggregate, discover, and stream media directly from local Bangladeshi ISP media servers (DhakaFlix and ICC Media Portal) without downloading entire files or re-encoding media streams.

Built with **React**, **TypeScript**, **Tailwind CSS**, and **Node.js**, featuring a custom **VLC-inspired video player** with HTTP 206 partial-content seeking, subtitle synchronization, and strict SSRF defenses.

---

## 🌟 Key Features

### 1. Unified ISP Source Integration
- **DhakaFlix (`http://172.16.50.4/`)**:
  - Automatically crawls h5ai storage clusters (`172.16.50.7`, `172.16.50.14`, `172.16.50.12`, `172.16.50.10`).
  - Catalogs English Movies, 1080p BluRay releases, Hindi Movies, South Movies, TV & Web Series, and Animations.
  - Detects native poster artwork (`.jpg`, `.png`), video versions (`.mp4`, `.mkv`), and embedded subtitle files (`.srt`, `.vtt`).
  - Supports full **HTTP 206 Partial Content byte-range requests** for instant seeking.
- **ICC Media Portal (`http://10.16.100.244/`)**:
  - Probes host reachability and detects subscriber captive firewall requirements (`notice.html` / `vfw.php`).
  - Provides subscriber session token management via Platform Settings (`dashboard.php?session=...`).
  - Reports transparent diagnostics and technical limitations when an active subscriber session is not detected.

### 2. VLC-Inspired Custom Player
- **Signature VLC Interface**:
  - Sleek dark slate layout accented with VLC's signature cone-orange (`#FF8800`).
  - Scrub bar with buffered progress indicator, click-to-seek, and hover timestamp preview tooltip.
  - Dynamic time display: click elapsed time to toggle between total duration and remaining time (`-MM:SS`).
- **Comprehensive Playback Controls**:
  - Play, pause, 10-second skip backward / forward, and double-click fullscreen.
  - Multi-speed playback: `0.25x`, `0.5x`, `0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`.
  - Volume slider with percentage indicator and single-click mute.
  - Picture-in-Picture (PiP) and Cinema Mode for distraction-free watching.
- **Subtitle Engine**:
  - In-browser SubRip (`.srt`) to WebVTT (`.vtt`) real-time parser and converter.
  - Subtitle delay synchronizer (`-500ms`, `-100ms`, `+100ms`, `+500ms`) to fix out-of-sync audio.
  - Support for dragging and dropping external `.srt` or `.vtt` subtitle files directly into the player.
  - Configurable subtitle font sizes (small, medium, large) and background opacity.
- **VLC Media Information Modal**:
  - Real-time technical stream statistics: resolution, MIME type, container format, range request health, and buffer percentage.
- **Auto-Hide & Watch Progress**:
  - Auto-hides player controls after 3 seconds of mouse inactivity.
  - Auto-saves watch progress to `localStorage` every 5 seconds with one-click "Resume Watching".

### 3. Rigorous Security & SSRF Protection
- **Strict Allowlist**: Media relay endpoints only permit requests to explicitly verified RFC1918 ISP hosts:
  - `172.16.50.4`, `172.16.50.7`, `172.16.50.8`, `172.16.50.10`, `172.16.50.12`, `172.16.50.14`
  - `10.16.100.244`
- **Zero Localhost/Metadata Access**: Rejects `127.0.0.1`, `localhost`, AWS/GCP cloud metadata (`169.254.169.254`), and arbitrary external WAN IP addresses.
- **Zero Disk Buffering**: Media files are piped downstream with HTTP Range headers directly from the upstream ISP source, preventing disk exhaustion on the application server.

---

## ⌨️ VLC Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Space</kbd> | Play / Pause |
| <kbd>&larr;</kbd> / <kbd>&rarr;</kbd> | Seek backward / forward 5 seconds |
| <kbd>Shift</kbd> + <kbd>&larr;</kbd> / <kbd>&rarr;</kbd> | Seek backward / forward 30 seconds |
| <kbd>&uarr;</kbd> / <kbd>&darr;</kbd> | Volume up / down (5%) |
| <kbd>F</kbd> | Toggle Fullscreen |
| <kbd>M</kbd> | Mute / Unmute audio |
| <kbd>C</kbd> | Toggle Subtitles on / off |
| <kbd>[</kbd> / <kbd>]</kbd> | Decrease / Increase playback speed |
| <kbd>Esc</kbd> | Exit Cinema Mode or Fullscreen |

*Keyboard shortcuts are automatically suppressed when typing inside search or input fields.*

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) v18.0.0 or higher
- [npm](https://www.npmjs.com/) v9.0.0 or higher
- Active connection to a supported local ISP network to reach `172.16.50.4` or `10.16.100.244`.

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/your-username/bdstream.git
cd bdstream
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration:
```env
PORT=3001
DHAKAFLIX_BASE_URL=http://172.16.50.4/
ICC_BASE_URL=http://10.16.100.244/
ICC_SESSION_TOKEN=
CATALOG_CACHE_TTL=900
CLIENT_URL=http://localhost:5173
```

### 3. Development Server
Start both the backend streaming gateway and the Vite frontend simultaneously:
```bash
npm run dev
```
- Frontend UI: `http://localhost:5173`
- Backend API: `http://localhost:3001`

### 4. Running Tests
Run the Vitest test suite for SSRF guardrails and player utilities:
```bash
npm test
```

### 5. Production Build
Compile the client bundle and verify TypeScript types:
```bash
npm run build
```

---

## 🌐 Deployment & Network Architecture

### Important Note on Public Cloud Hosting
- The media sources (`http://172.16.50.4/` and `http://10.16.100.244/`) reside on **private RFC1918 ISP subnets** (`172.16.0.0/12` and `10.0.0.0/8`).
- A public cloud server (e.g., Vercel, AWS EC2, Render) running on the public internet **cannot route traffic to private ISP subnets** unless connected through a local ISP gateway or Site-to-Site VPN.
- **Recommended Setup**:
  - Run BDStream on a home server, Raspberry Pi, or local PC on the ISP network.
  - Or deploy the frontend as a static site and run the lightweight BDStream gateway daemon locally within the ISP network.

---

## 🛠️ Diagnostics & Troubleshooting

| Issue | Cause | Resolution |
| :--- | :--- | :--- |
| **"DhakaFlix Offline"** | Your current internet connection is not routed through the DhakaFlix ISP network. | Switch to your BDIX/ISP connection or verify `ping 172.16.50.4`. |
| **"ICC Auth Required"** | ICC firewall redirects unauthenticated requests to `notice.html` or `login.php`. | Open ICC login page, obtain your subscriber session token, and paste it into **Settings &rarr; ICC Session Token**. |
| **Video fails to play** | Video container is MKV with an unsupported audio codec (e.g. AC3/DTS). | Modern Chromium supports H.264 video. If an exotic audio codec is used, open the direct URL in native VLC Desktop Player. |
| **CORS / Image Error** | Browser Private Network Access blocks raw LAN fetches from public origins. | BDStream routes posters and streaming via its authorized `/api/playback/proxy-asset` and `/api/playback/stream` endpoints. |

---

## 📄 License
MIT License. Created for local educational and personal media aggregation purposes.
