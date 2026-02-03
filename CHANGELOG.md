# Changelog

## [4.0.0] - 2026-02-01

### Added
- ✅ Database camere espanso: 50+ modelli (ZWO, QHY, ToupTek, Omegon, Canon, Nikon, Sony)
- ✅ Configurazione camera personalizzata completamente funzionante
- ✅ Calcolo FOV e image scale automatico
- ✅ Connessione manuale per NINA/Ekos con campi host/porta
- ✅ Modalità Standalone completa con guida scatti dettagliata
- ✅ Modalità Foto Solare con calcolo posizione real-time
- ✅ Consigli seeing automatici basati su altitudine sole
- ✅ Time-lapse solare automatico
- ✅ Indicatore filtro grande e visibile (rosso ON / giallo OFF lampeggiante)
- ✅ Sistema allarmi completo (audio beep 880Hz + vibrazione + notifiche browser)
- ✅ Allarmi programmati: C2 -30s, -10s, 0s | C3 -10s, 0s
- ✅ Progress bar 0-100% con colori per fase
- ✅ Timeline eventi con C1/C2/C3/C4
- ✅ Parametri scatto specifici per ogni fase
- ✅ Consigli bracketing dettagliati
- ✅ Calcolo durata totalità
- ✅ CSS completo con animazioni

### Fixed
- ✅ Custom camera fields ora si aprono correttamente
- ✅ Selezione camera salva correttamente FOV e pixel size
- ✅ Checkbox connessione manuale mostra/nasconde form
- ✅ Standalone mode si attiva automaticamente
- ✅ Solar mode calcola posizione correttamente
- ✅ Tutti i handler UI funzionanti
- ✅ Tutti gli errori console risolti

### Changed
- Camera dropdown organizzato per marca con 50+ modelli
- Equipment panel con display info dettagliate
- Solar mode con update automatico ogni 10 secondi
- UI migliorata con card separate per ogni funzionalità

## [3.1.0] - 2026-01-30

### Added
- Countdown con allarmi base
- Database camere limitato (10 modelli)
- Modalità standalone parziale
- Foto solare base

### Issues
- Custom camera non funzionante
- FOV non salvato
- Connessione manuale non operativa
- Solar mode non calcolava posizione
- Vari bug UI

## [3.0.0] - 2026-01-28

### Added
- Architettura modulare ES6+
- Database eclissi 2024-2030
- Location manager con GPS
- Platform adapters (NINA, Ekos)
- Countdown base
- Equipment management base

## [2.0.0] - 2025-12-15

### Added
- Calcoli astronomici
- Database eclissi
- UI base

## [1.0.0] - 2025-11-01

### Added
- Proof of concept iniziale
