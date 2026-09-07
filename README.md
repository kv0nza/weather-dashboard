# SkyPulse Weather Dashboard 🌦️

A modern, fully-responsive, and visually stunning Weather Dashboard web application powered in real-time by the [Open-Meteo](https://open-meteo.com/) API.

---

## ✨ Features

- 📐 **Fully Resizable & Responsive to Any Browser Window**:
  - Dynamically resizes from widescreen monitors (up to 4K) down to laptop screens, tablets, split-screen snap mode, and mobile viewports.
  - Highlights matrix automatically adapts from 1 column up to 6 columns using fluid CSS grid auto-fit.
  - Interactive Canvas 24-hour hourly trend curve automatically recalculates its width and redraws with sharp high-DPI scaling on window resize via `ResizeObserver`.
- 🌍 **Global City Search with Instant Autocomplete**:
  - Search any city, town, or region worldwide with instant suggestions as you type.
  - Automatically queries the Open-Meteo Geocoding engine with debounce.
- 🎯 **One-Click Geolocation ("Locate Me")**:
  - Uses browser GPS/HTML5 geolocation to fetch local forecasts immediately.
- 🌡️ **Comprehensive Hero Weather Card**:
  - Current real-time temperature, condition badge, and dynamic custom vector weather icons.
  - "Feels like" (apparent temperature), High / Low daily range, and current precipitation mm.
- 📊 **6-Card Meteorological Highlights Matrix**:
  - **Wind Status**: Speed in km/h or mph with an **interactive rotating compass needle** indicating heading and cardinal direction (N, NE, SW, etc.).
  - **Humidity**: Moisture percentage with visual fill bar and comfort assessment.
  - **UV Index**: Real-time UV rating (0–12+) with color-coded risk indicator and health advice.
  - **Precipitation Chance**: Max chance of rain with visual probability bar.
  - **Sun & Daylight Tracker**: Precise sunrise and sunset timings.
  - **Surface Atmospheric Pressure**: Recorded in hPa with weather tendency interpretation.
- ⏱️ **24-Hour Hourly Forecast with Dual Views**:
  - **Card View**: Horizontally scrollable strip displaying hourly icons, temperatures, and rain chances.
  - **Trend Graph View**: Custom high-DPI HTML5 Canvas chart displaying smooth temperature curves and precipitation probability bars.
- 📅 **10-Day Extended Outlook**:
  - 10-day forecast cards with date subtitles, weather icons, rain probability, and colored temperature range bars showing relative min/max gradients.
  - Interactive selection: click any of the 10 days to sync the entire dashboard to that day's full telemetry.
- 🔄 **Instant Unit Switcher (°C / °F)**:
  - Toggle between Metric (°C, km/h) and Imperial (°F, mph) on the fly without waiting for network reloads. Saved automatically in `localStorage`.
- ⭐ **Pinned / Favorites Bar**:
  - Pin any searched city to your quick-access favorites bar with one click.
  - Preloaded with major world cities (Sydney, New York, London, Tokyo, Paris).
- 🎨 **Dynamic Atmospheric Visual Themes**:
  - Adapts to weather condition & day/night cycle:
    - Clear Sunny Day
    - Starry Night Sky (with animated twinkling stars)
    - Cloudy & Overcast
    - Rainy (with animated falling raindrops)
    - Snowfall (with drifting snowflakes)
    - Thunderstorm

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
