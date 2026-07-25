# ARRMapper Field Tool
A mobile-first offline-capable progressive web app (PWA) for field data collection on Afforestation, Reforestation and Revegetation (ARR) carbon projects in India.

Deployed at: **https://forestsoil.github.io/ARRmapper/app.html**

---

## Tools

### 🌱 Plantation Mapper
Draw species blocks over a loaded KML boundary, auto-generate a sapling grid at configurable spacing, and export as KML + Shapefile ZIP. Supports 14+ native species with Hindi and Bengali display names.

### 🧪 Soil Mapper
Assign soil type classifications (Sandy through Lowland/Organic) to spatial blocks within a plot boundary. Export as KML + Shapefile.

### 📐 Vector Tool
Capture GPS walk polygons, manual polygons, point-of-interest markers, and track lines. All polygon exports include a **stage** property (eligibility / negotiated / surveyed / cleared / final / revised) and an optional **revision_reason** (flood hazard, fire hazard, bank erosion, beneficiary dropout, encroachment, other) to track iterative boundary refinement through the full plot lifecycle. Exports as KML + GeoJSON sidecar.

### 📋 MRV Tool
Monitoring, Reporting and Verification field visits aligned to VM0047. Loads sapling points from device storage (Plantation Mapper exports or synced legacy plots) and draws a stratified random sample (density-tiered: 15/25/35 pts/ha, min 10). Records per-point grade (A+→D), height, DBH, and notes. Six plot-level metrics (survival, fencing condition, threat/encroachment, watering/irrigation, owner engagement, wildlife damage) contribute a weighted composite score (0–100) mapped to A+→D. Quarterly photo capture per species block. Uploads visit records as GeoJSON to Google Drive.

### 📁 Files
Manage the local OPFS file cache — view, download, or delete stored KML, GeoJSON, and photo files. Includes **Sync Legacy Plots** to pull 2024–2026 fencing polygons from the Drive `_legacy/` folder into OPFS for use in the MRV Tool.

---

## Architecture
- Single-file HTML/JS PWA — no build step, no framework
- **Offline-first**: all data written to OPFS and IndexedDB; Drive upload queued when offline
- **Google Sign-In (GIS)** for user identity; uploads routed to project-specific Google Drive accounts via Apps Script endpoints
- **Leaflet** for mapping; **Google Static Maps** for thumbnail previews
- Trilingual UI: English / বাংলা (Bengali) / हिंदी (Hindi)
- Minified production build (`app.html`) generated locally via Terser

## Drive Folder Structure
```
ARRmapper/
  PlantationMapper/{username}/
  SoilMapper/{username}/
  VectorTool/{username}/
  MRVTool/{username}/
  VectorTool/_legacy/          ← legacy fencing polygons (2024–2026, read-only)
```

## Projects
| Key | Label | Districts | Drive Account |
|-----|-------|-----------|---------------|
| Asha1 | Asha 1 (2023) | Jalpaiguri, Alipurduar, Coochbehar, West Bengal | asha1.data@tomorrowsfoundation.in |
| Asha2 | Asha 2 Tea (2027) | Darjeeling, Kalimpong, West Bengal | asha2.data@tomorrowsfoundation.in |
| Arun | Arun (2025) | Namsai, Changlang, Lohit, Lower Dibang Valley, East Siang, Arunachal Pradesh | arun.data@tomorrowsfoundation.in |
| Banani | Banani (2025) | Birbhum, Bankura, Purulia, Jhargram, Paschim Bardhaman, West Bengal | banani.data@tomorrowsfoundation.in |

---

## Development
- `app.html` — minified production file (deploy this)
- `plantationMapper_field_vXX_mobileLS_DEVX.html` — unminified source of truth
- Minify: `terser --compress --mangle --mangle-props 'regex=/^_/'` on the script block only
- Always patch via targeted `must_replace()` with assertion guards; avoid structural refactors

## Apps Script
Two versions in use:
- `FieldTool_AppsScript_v4.js` — base64 POST upload handler; deploy once per project Drive account (Execute as: Me, Access: Anyone)
- `FieldTool_AppsScript_v5.js` — v4 + additive GET routes: `?action=listLegacy` and `?action=getLegacyFile&name=xxx` for legacy plot sync

---

## License
Internal use — Tomorrow's Foundation / EcoAct ARR carbon projects, India.  
© 2025–2026 Nirmalya Chatterjee. All rights reserved.
