# SkyPulse Weather Dashboard 🌦️

A modern, fully-responsive, and visually stunning Weather Dashboard web application powered in real-time by the **Australian Bureau of Meteorology (BOM) API** (`api.weather.bom.gov.au`) with global satellite fallback via [Open-Meteo](https://open-meteo.com/).

---

## ✨ Features

- 🇦🇺 **Official Bureau of Meteorology (BOM) Ingestion**:
  - Live ground meteorological observations (temperature, apparent "feels like", wind speed/direction, humidity, and rain since 9 AM).
  - Ground observation station provenance (e.g. `📍 Sydney - Observatory Hill (066214)`).
  - Official BOM synoptic forecast text descriptions.
  - Active Bureau of Meteorology weather warning and hazard alert banners.
  - Australian suburb, city, and postcode autocomplete search (e.g. "Sydney", "Parramatta", "2000", "3000").
- ☀️ **Diurnal UV Solar Curve & Hazard Graphing**:
  - Mini daylight progression curve (6 AM - 12 PM - 6 PM) in the UV Index card with current/peak hour markers.
  - Interactive 24-hour Canvas graph with color-coded WHO risk hazard bands (Low, Moderate, High, Very High, Extreme) and peak UV callouts.
- 📅 **BOM Extended Daily Forecast**:
  - Daily forecast cards with date subtitles, weather icons, rain probability, and proportional temperature range bars.
  - Interactive selection: click any day to synchronize the entire dashboard (hero card, atmospheric background, highlights, and hourly timeline) to that specific day.
  - "Live Now" pulsing button for instant 1-click return to current live weather.
- 📐 **Fully Resizable & Responsive to Any Browser Window**:
  - Dynamically adapts across all devices and window sizes from mobile to 4K widescreen monitors.
  - Highlights matrix fluidly auto-fits from 1 to 6 columns without horizontal clipping.
- ⏱️ **24-Hour Hourly Forecast with 3 Views**:
  - **Cards**: Horizontally scrollable strip of hourly icons, temperatures, rain %, and UV tags.
  - **Temp & Rain**: Dual interactive canvas chart with temperature line and rain probability bars.
  - **UV Solar Curve**: High-DPI canvas graphing diurnal solar progression against hazard bands.
- 🔄 **Instant Unit Switcher (°C / °F)**:
  - Toggle between Metric (°C, km/h) and Imperial (°F, mph) on the fly without network reloads. Saved in `localStorage`.
- ⭐ **Pinned / Favorites Bar**:
  - Preloaded with Australian state capitals (Sydney, Melbourne, Brisbane, Perth, Adelaide, Hobart, Canberra).
  - Pin any searched suburb or location with 1 click.
- 🎨 **Dynamic Atmospheric Visual Themes**:
  - Adapts to weather conditions & day/night cycles with animated rain, drifting snow, stars, and atmospheric gradients.
- 🌍 **Global Fallback**:
  - Automatic fallback to Open-Meteo when searching international cities outside Australia.

---

## 🚀 How to Run

You can run the dashboard in any of the following ways:

### 1. Using npm (Node.js)
In your terminal, run:
```bash
npm start
```
Starts the local server at `http://localhost:3000` and automatically launches your default browser.

### 2. Using Python 3
In your terminal, run:
```bash
python server.py
```
Starts the local Python server at `http://localhost:8000` and automatically launches your default browser.

### 3. Using the Windows Launcher
Double-click `run_dashboard.bat`. It will detect Python or Node automatically, or open `index.html` directly in your default browser.

### 4. Direct Browser Opening
Simply double-click `index.html` or open it in Chrome, Edge, Firefox, Brave, etc.

---

## 🐳 Docker Deployment

SkyPulse can be built and run as a self-contained container using **Docker** or **Docker Compose**.

### Option A: 1-Click Windows Launcher
Double-click `run_docker.bat`. It verifies Docker daemon status, builds the image, runs the container on `http://localhost:3000`, and opens your browser.

### Option B: Docker Compose (Recommended)
```bash
# Build and start in background
docker compose up -d

# View logs
docker compose logs -f

# Stop container
docker compose down
```

### Option C: Docker CLI / npm Scripts
```bash
# Using npm shortcuts:
npm run docker:build
npm run docker:run
npm run docker:stop

# Or using standard Docker CLI:
docker build -t skypulse-weather .
docker run -d -p 3000:3000 --name skypulse-weather-dashboard skypulse-weather
```
Open `http://localhost:3000` in your browser.

### Option D: Ultra-Lightweight Nginx Image (~23MB)
For an ultra-compact production static web server:
```bash
docker build -f Dockerfile.nginx -t skypulse-weather:nginx .
docker run -d -p 8080:80 --name skypulse-nginx skypulse-weather:nginx
```
Open `http://localhost:8080` in your browser.

---

## 🛠️ Architecture & Technology Stack

- **HTML5 & Semantic Structure**: Fluid container and accessible controls.
- **Modern CSS3 Glassmorphism**: `backdrop-filter: blur(20px)`, fluid typography (`clamp()`), adaptive CSS Grid `repeat(auto-fit, minmax(180px, 1fr))`, and subtle weather particle FX.
- **Vanilla ES6+ JavaScript**:
  - Dynamic `ResizeObserver` for pixel-perfect hourly canvas charts.
  - Open-Meteo Forecast & Geocoding APIs (`Access-Control-Allow-Origin: *`).
  - Persistent state in `localStorage` for units and favorites.
- **Node.js & Python Standard Libraries**: Zero external packages or `node_modules` required.

---

## 🐙 Git & GitHub Integration

### 1. Install Git (if not already installed)
If you don't have Git installed yet, run this in PowerShell or Command Prompt:
```powershell
winget install --id Git.Git -e --source winget
```
*(Or download the Windows installer from [git-scm.com](https://git-scm.com/))*

### 2. Connect this Folder to a GitHub Repository
1. Go to [GitHub](https://github.com/new) and create a new repository (e.g. `weather-dashboard`). Leave "Initialize this repository with a README" **unchecked**.
2. Run these commands in your project folder:
```powershell
git init
git add .
git commit -m "Initial commit of SkyPulse weather dashboard"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

### 3. Pushing Updates After Every Change
Whenever you make changes, push them with any of these methods:

- **Method A: 1-Click Batch Helper**
  Double-click `push.bat` (or run `./push.bat "Your update note"`). It stages, commits, and pushes automatically.
- **Method B: npm Script**
  ```bash
  npm run push
  ```
- **Method C: Git CLI**
  ```bash
  git add .
  git commit -m "Describe your update"
  git push
  ```

### 4. Optional: Free Live Hosting with GitHub Pages
To publish your weather dashboard live on the internet:
1. In your GitHub repository, navigate to **Settings** > **Pages**.
2. Under **Build and deployment** > **Source**, choose **Deploy from a branch**.
3. Set the branch to `main` and folder to `/(root)`, then click **Save**.
4. Within 1-2 minutes, your dashboard will be live at:
   `https://<YOUR_USERNAME>.github.io/<YOUR_REPOSITORY>/`
   Every time you push an update, the live website updates automatically!

---

## 📄 License
MIT License. Free to use, modify, and customize.
