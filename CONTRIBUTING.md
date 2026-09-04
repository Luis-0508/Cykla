# Zu Cykla beitragen

Danke für dein Interesse. Cykla verarbeitet besonders sensible Gesundheitsdaten;
kleine, nachvollziehbare Änderungen und datensparsame Entscheidungen haben Vorrang.

## Lokale Entwicklung

```bash
npm install
npm start
```

Vor einem Pull Request:

```bash
npm run typecheck
npm run lint
npm run format
npm test
```

## Grundsätze

- Keine Gesundheitsdaten in Logs, Telemetrie, Fehlerberichte oder Test-Fixtures.
- Keine Netzwerkübertragung ohne vorherige Architektur- und Datenschutzprüfung.
- Dokumentierte und berechnete Daten strikt getrennt halten.
- Prognoselogik ausschließlich als reine Funktion in `src/domain/` ändern.
- Jede Änderung der Prognose braucht Tests und eine verständliche Erklärung im UI.
- Sichtbare Texte neutral formulieren; Schätzungen nie als Gewissheit darstellen.
- Keine Marken, Texte, Screenshots, Illustrationen oder Layouts bestehender Apps
  kopieren.
- Touch-Ziele, Screenreader-Texte, Kontrast und dynamische Schriftgrößen mitprüfen.

## Commit- und PR-Inhalt

Beschreibe:

1. das gelöste Problem,
2. die Datenschutzwirkung,
3. die Änderung dokumentierter oder berechneter Daten,
4. ausgeführte Tests,
5. bei UI-Änderungen die geprüften Bildschirmgrößen und Farbschemata.

Nutze in Screenshots und Tests ausschließlich künstliche Angaben. Medizinische
Aussagen benötigen vor Veröffentlichung eine fachkundige Prüfung.
