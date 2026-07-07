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
Capture GPS point-of-interest markers and track lines. Export as GeoJSON or KML.

### 📋 MRV Tool
Monitoring, Reporting and Verification field visits against planted sapling points. Loads sapling GeoJSON from device storage, draws a stratified random sample (density-tiered: 15/25/35 pts/ha, min 10), and records per-point grade (A+→D), height, DBH, and notes. Quarterly photo capture per species block. Uploads visit records as GeoJSON to Google Drive.

### 📁 Files
Manage local OPFS file cache — view, download, or delete stored KML, GeoJSON, and photo files.

---

## Architecture

- Single-file HTML/JS PWA — no build step, no framework
- **Offline-first**: all data written to OPFS and IndexedDB; Drive upload queued when offline
- **Google Sign-In (GIS)** for user identity; uploads routed to project-specific Google Drive accounts via Apps Script endpoints
- **Leaflet** for mapping; **Google Static Maps** for thumbnail previews
- Minified production build (`app.html`) generated locally via Terser

## Drive Folder Structure

```
ARRmapper/
  PlantationMapper/{username}/
  SoilMapper/{username}/
  VectorTool/{username}/
  MRVTool/{username}/
```

## Projects

| Key | Label | Drive Account |
|-----|-------|---------------|
| Asha1 | Asha 1 (2023) | asha1.data@tomorrowsfoundation.in |
| Asha2 | Asha 2 Tea (2027) | asha2.data@tomorrowsfoundation.in |
| Arun | Arun (2025) | arun.data@tomorrowsfoundation.in |
| Banani | Banani (2025) | banani.data@tomorrowsfoundation.in |

---

## Development

- `app.html` — minified production file (deploy this)
- `plantationMapper_field_vXX_mobileLS_DEVX.html` — unminified source of truth
- Minify with: `terser --compress --mangle --mangle-props 'regex=/^_/'` on the script block only

## Apps Script

`FieldTool_AppsScript_v4.js` — deploy once per project Drive account as a Web App (Execute as: Me, Access: Anyone). Handles base64 file upload into the `ARRmapper/` folder hierarchy.

---

## License

Internal use — Tomorrow's Foundation / EcoAct ARR carbon projects, India.  
© 2025–2026 Nirmalya Chatterjee. All rights reserved.
