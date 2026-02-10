# arvis

Kleine Web-Visualisierung der Bevölkerungsentwicklung Deutschlands nach Altersgruppen.

Inhalt
- Interaktive 3D-Balkendiagramm-Ansicht mit Three.js (`index.html` + `scripts/three-barchart.js`).
- Lokale Daten liegen im `data/`-Ordner. Wichtige Dateien:
	- `data/data_groups.csv` — aggregierte Werte pro Altersgruppe und Jahr (verwendet für die Visualisierung).
	- `data/B23-Altersgruppen-1871-Vorausberechnung_csv.csv` — ursprüngliche Quell-CSV (bereinigt).

Eigenschaften
- Rotierbare 3D-Ansicht mit `OrbitControls`.
- Bodenfläche und Schatten (DirectionalLight + shadowMap).
- Hover-Tooltip und Legende für Altersgruppen.

Datenquelle
https://ckan.govdata.de/de/dataset/bevolkerung-in-deutschland-nach-altersgruppen-ab-1871/resource/0bad03f6-b175-4692-af59-6b2e5201dcac

Lokales Testen
1. Im Projektverzeichnis einen einfachen HTTP-Server starten (ES-Module und Fonts benötigen HTTP):

```bash
python3 -m http.server 8000
```

2. Öffnen Sie im Browser: `http://localhost:8000/`

Lizenz / Hinweise
- Die Datenquelle ist oben angegeben. Dieses Repository enthält ein einfaches Visualisierungsbeispiel; bei Weiterverwendung der Daten bitte die Quelle angeben.
