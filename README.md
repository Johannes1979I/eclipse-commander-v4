# 🌑 Eclipse Commander v4.0 - Complete Edition

Professional Solar Eclipse Photography Application

## ✨ NEW IN v4.0

✅ **50+ Cameras Database** (ZWO, QHY, ToupTek, Omegon, Canon, Nikon, Sony)  
✅ **Complete Alarms System** (Audio beeps, vibration, browser notifications)  
✅ **Large Filter Indicator** (Red ON / Yellow OFF flashing)  
✅ **Standalone Mode** (Works without PC - complete guide)  
✅ **Solar Photography** (Real-time position + seeing advice)  
✅ **Manual Connection** (Custom host/port for NINA/Ekos)  
✅ **All Bugs Fixed** (Custom camera, FOV calculation, everything works!)  

## 🚀 INSTALLATION

1. Extract ZIP
2. Upload to GitHub repository
3. Settings → Pages → Enable
4. Wait 2 min
5. Open: `https://USERNAME.github.io/REPO/`

OR local:
```bash
python -m http.server 8000
# Open: http://localhost:8000
```

## 📖 QUICK START

1. **Location:** GPS or manual lat/lon
2. **Eclipse:** Select from 2024-2030 database
3. **Equipment:** 
   - Select camera (50+ models) OR "Manual Configuration..."
   - Enter diameter + focal length
   - Save → See FOV calculated
4. **Countdown:** Starts automatically
   - Audio alarms at C2/C3
   - Large filter indicator
   - Standalone guide visible

## 🎯 MODES

### Eclipse Mode
- Countdown timer
- Audio alarms (C2 -30s, -10s, 0s | C3 -10s, 0s)
- Filter indicator: 🔴 ON / ⚠️ OFF
- Standalone guide (works without PC)
- Platform connection (NINA/Ekos)

### Solar Mode  
- Real-time sun position
- Seeing advice (>50° = EXCELLENT)
- Filter parameters (ND5, H-alpha, Ca-K)
- Time-lapse automation

## 📸 CAMERAS (50+)

**ZWO ASI (15):** 120MM Mini, 183MM/MC Pro, 294MM/MC Pro, 533MM/MC Pro, 1600MM/MC Pro, 2600MM/MC Pro, 2400MM/MC Pro, 6200MM/MC Pro

**QHY (5):** 163M, 183M, 268M, 294M, 600M

**ToupTek (3):** GPCMOS01200KMA, GPCMOS02000KMA, ATR3CMOS16000KMA

**Omegon (3):** veTEC 432M, 533C, 571C

**Canon (8):** 6D, 6D II, 80D, 90D, Ra, R5, R6, 5D Mark IV

**Nikon (5):** D750, D850, D7500, Z6, Z7

**Sony (4):** A7 III, A7R III, A7R IV, A7S III

## 🗓️ ECLIPSE DATABASE

- Aug 12, 2026 - Total (Spain, Iceland)
- Feb 6, 2027 - Annular (South America)
- Aug 2, 2027 - Total (North Africa, Middle East)
- Jan 26, 2028 - Total/Annular (Australia, Ecuador)
- Nov 25, 2030 - Total (South Africa, Australia)

## 🔧 TECH STACK

- HTML5, CSS3, JavaScript (vanilla)
- Modular ES6+ architecture
- PWA (Service Worker, Manifest)
- LocalStorage
- Geolocation, Notifications, Web Audio, Vibration APIs
- NINA & Ekos/INDI API support

## 📂 STRUCTURE

```
eclipse-commander-v4.0/
├── index.html
├── css/styles.css
├── data/eclipses.json
├── js/
│   ├── core/           (Astronomy calculations)
│   ├── equipment/      (50+ cameras database)
│   ├── modes/          (Eclipse, Solar, Standalone)
│   ├── platforms/      (NINA, Ekos)
│   └── ui/             (Countdown, alarms, controls)
└── README.md
```

## 🆘 TROUBLESHOOTING

**Alarms don't sound:** Click page once (AudioContext requires user interaction)  
**Filter indicator missing:** Hard refresh (Ctrl+Shift+R)  
**Custom camera not working:** Select "Manual Configuration..." in dropdown  
**Manual connection not showing:** Check "Manual Connection" checkbox  
**Solar mode not calculating:** Set location first, then click "Update Position"  

## 📊 BROWSER SUPPORT

Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

## 🎓 CREDITS

**Developer:** Johannes  
**Version:** 4.0.0 Complete  
**Date:** February 2026  
**License:** MIT  

---

**Eclipse 2027 Ready!** 🌑📸✨

*Professional Solar Eclipse Photography Application*
