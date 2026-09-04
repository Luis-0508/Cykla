# Cykla

Cykla ist ein kostenloser, quelloffener und offline-first Zyklus-, Perioden- und
Gesundheits-Tracker für iOS und Android. Das MVP funktioniert ohne Konto und ohne
Backend. Gesundheitsdaten bleiben in einer lokalen SQLite-Datenbank.

> Cykla dokumentiert und schätzt. Die App stellt keine Diagnose dar, ist keine
> sichere Verhütungsmethode und ersetzt keine medizinische Beratung.

## MVP-Funktionen

- deutsches Onboarding mit Ziel, letzter Periode sowie typischer Zyklus- und
  Blutungsdauer
- Startseite „Heute“ mit dokumentiertem Status und vorsichtig formulierter Prognose
- Monatskalender mit klar getrennten dokumentierten und berechneten Markierungen
- Tageseditor für Blutung, Schmerzen, Stimmung, Energie, Schlaf, Symptome und Notizen
- regelbasierte lokale Periodenprognose mit Zeitraum, Konfidenz und Erklärung
- einfache Zyklusstatistik und manuelles Ausschließen einzelner Zyklen
- lokale, neutral formulierte Tageserinnerung
- optionale App-Sperre über die Gerätesicherheit
- Hell-, Dunkel- und Systemdarstellung
- JSON- und CSV-Export sowie vollständiges lokales Löschen
- keine Werbung, kein externes Analytics-SDK, kein Konto und keine Cloud

## Installation

Voraussetzungen:

- Node.js 20.19 oder neuer
- npm
- Expo Go oder ein Android-/iOS-Simulator

```bash
npm install
npm start
```

Danach kann die App über den QR-Code in Expo Go oder mit `a` beziehungsweise `i` im
Terminal gestartet werden.

Das Projekt verwendet bewusst Expo SDK 54, weil die App-Store-Version von Expo Go
während der aktuellen SDK-Übergangsphase auf echten iPhones SDK-54-Projekte lädt.

Weitere Befehle:

```bash
npm run android
npm run ios
npm run web
npm run typecheck
npm run lint
npm run format
npm test
```

Unter Windows können alternativ `start-ios.bat` für ein echtes iPhone mit Expo Go
oder `start-web.bat` für die Web-Vorschau doppelt angeklickt werden.

Lokale Benachrichtigungen und biometrische App-Sperre benötigen ein unterstütztes
Mobilgerät. Die Web-Ausgabe dient als responsive Entwicklungsvorschau und ist nach
`npm run web` unter `http://localhost:8082` erreichbar. Das Startskript ergänzt die
für Expo SQLite/WASM erforderlichen Cross-Origin-Header.

## Architektur

```text
app/                         Expo-Router-Routen und Screens
  (tabs)/                    Heute, Kalender, Eintragen, Trends, Einstellungen
  day/[date].tsx             Tageseditor
src/
  components/                wiederverwendbare UI- und Kalenderkomponenten
  config/branding.json       gemeinsame Quelle für Name, IDs und Markenfarben
  database/                  Migration und SQLite-Repository
  domain/                    reine Datums-, Zyklus-, Statistik- und Prognoselogik
  hooks/                     TanStack-Query-Brücke zwischen UI und SQLite
  i18n/de.ts                 zentrale deutsche Textstruktur
  services/                  Export, lokale Erinnerungen und App-Sperre
  store/                     flüchtiger UI-State mit Zustand
  theme/                     eigenes Hell-/Dunkel-Designsystem
```

Die React-Komponenten berechnen keine Prognosen. `src/domain/` ist unabhängig von
React Native und wird mit Vitest getestet. React Hook Form und Zod validieren
Onboarding und Tageseditor. TanStack Query koordiniert das Lesen und Invalidieren
der lokalen SQLite-Daten; es gibt keine Netzwerkabfragen.

## Datenmodell

Dokumentierte Daten werden in `daily_entries` und `symptom_entries` gespeichert.
Manuelle Zyklusausschlüsse liegen separat in `cycle_exclusions`. Einstellungen
liegen als einfache Schlüssel/Werte in `app_settings`.

Berechnete Daten werden **nicht** gespeichert:

- erwarteter Periodenbeginn
- Prognosezeitraum
- Konfidenz
- geschätzter Eisprung
- möglicher fruchtbarer Zeitraum

Sie entstehen zur Laufzeit aus dokumentierten Periodentagen. Dadurch kann ein
berechneter Tag nie versehentlich als Nutzereintrag erscheinen oder exportiert
werden.

## Prognosemodell

1. Zusammenhängende dokumentierte Blutungstage bilden Perioden.
2. Die Differenz zweier Periodenstarts ergibt eine vollständige Zykluslänge.
3. Neuere Zyklen erhalten das Gewicht `0,85 ^ Alter`.
4. Deutliche Ausreißer bleiben erhalten, erhalten aber ein kleineres Zusatzgewicht.
5. Manuell ausgeschlossene Zyklen werden nicht einbezogen.
6. Der gewichtete Mittelwert bestimmt den rechnerischen Beginn.
7. Die Stichprobenstreuung bestimmt die Breite des sichtbaren Zeitraums.
8. Weniger als drei vollständige Zyklen ergeben niedrige Konfidenz; „hoch“ wird erst
   ab sechs stabilen Zyklen vergeben.

Alle Berechnungen verwenden lokale Kalenderdaten im Format `YYYY-MM-DD`, damit ein
Periodentag durch Reisen oder Zeitzonenwechsel nicht auf einen anderen Kalendertag
rutscht.

## Datenschutz und Sicherheit

Das MVP überträgt keine Gesundheitsdaten. Es enthält kein Werbe- oder externes
Analytics-SDK. JSON- und CSV-Exporte werden lokal erstellt und anschließend über den
Systemdialog geteilt. Die biometrische App-Sperre speichert nur ihren
Aktivierungsstatus im SecureStore; die Authentifizierung übernimmt das Betriebssystem.

SQLite ist im MVP lokal, aber nicht zusätzlich feldweise verschlüsselt. Ein
produktionsreifes Release sollte verschlüsselte Backups, Bedrohungsmodell,
Datenschutz-Folgenabschätzung und rechtliche Prüfung ergänzen. Details stehen in
[PRIVACY.md](./PRIVACY.md).

## Entwicklungsdaten

Im normalen Produktbetrieb gibt es keine Seed- oder Demo-Daten. Das Onboarding legt
nur die von der Person bestätigte letzte Periode an. Ein optionaler Entwicklungsmodus
mit Demo-Daten ist derzeit bewusst nicht enthalten.

## Qualität

Die Domänentests decken regelmäßige und unregelmäßige Zyklen, wenige oder fehlende
Daten, historische Änderungen, Ausreißer, manuelle Ausschlüsse, Monats- und
Jahreswechsel, Schaltjahre und datumssichere Zeitzonenbehandlung ab.

Vor einem Release:

```bash
npm run typecheck
npm run lint
npm run format
npm test
```

## Bewusst noch nicht implementiert

- Konten, Backend, Cloud-Synchronisierung und Mehrgerätebetrieb
- Schwangerschaftsmodus und Partnerzugang
- KI-Assistent, Diagnosen oder medizinischer Chatbot
- Community, Werbung, Abonnements und Bezahlschranken
- Apple Health, Health Connect, Basaltemperatur und Ovulationstests
- medizinische Artikelbibliothek und medizinischer Bericht
- englische Oberfläche (die Textstruktur ist auf weitere Sprachen vorbereitet)
- verschlüsselte SQLite-Datenbank und verschlüsselte automatische Backups

Weitere Schritte stehen in [ROADMAP.md](./ROADMAP.md).

## Mitwirken und Lizenz

Beiträge sind willkommen; siehe [CONTRIBUTING.md](./CONTRIBUTING.md). Cykla steht
unter der GNU Affero General Public License v3.0; siehe [LICENSE](./LICENSE).
