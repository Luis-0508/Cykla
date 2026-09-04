# Datenschutzmodell

Stand: 29. Juli 2026

Dieses Dokument beschreibt die technische Datenschutzabsicht des Cykla-MVP. Es ist
keine Rechtsberatung und ersetzt keine Datenschutzerklärung für ein veröffentlichtes
Produkt.

## Lokale Verarbeitung

Periodentage, Symptome, Stimmung, Schmerzen, Energie, Schlaf und Notizen werden in
einer lokalen SQLite-Datenbank auf dem Gerät gespeichert. Die Prognose wird lokal
berechnet. Das MVP besitzt kein Konto, kein Backend, keine Cloud-Synchronisierung,
keine Werbung und kein externes Analytics-SDK.

## Datentrennung

Von der Person dokumentierte Daten werden persistent gespeichert. Erwarteter
Periodenbeginn, Prognosezeitraum, Konfidenz, geschätzter Eisprung und möglicher
fruchtbarer Zeitraum werden zur Laufzeit berechnet und weder als Nutzereintrag
gespeichert noch exportiert.

## Betriebssystemfunktionen

- Lokale Erinnerungen werden vom Betriebssystem geplant. Ihr Text ist neutral und
  enthält keine konkreten Gesundheitsdaten.
- Bei aktivierter App-Sperre übernimmt das Betriebssystem die Authentifizierung. Cykla
  speichert nur die Aktivierung im SecureStore und erhält keine biometrischen Daten.
- Exporte werden lokal erzeugt. Erst der System-Teilen-Dialog kann sie an einen von der
  Person gewählten Zielort übergeben.

## Export

JSON enthält dokumentierte Tagesdaten und grundlegende Einstellungen. CSV enthält
eine flache Tabelle dokumentierter Tagesdaten. Tabellenformeln werden bei der
CSV-Erzeugung entschärft. Exportdateien können sensible Gesundheitsdaten enthalten
und sollten geschützt aufbewahrt werden.

## Löschen

„Alle lokalen Daten löschen“ entfernt Tagesdaten, Symptome, Zyklusausschlüsse und
Einstellungen aus der App-Datenbank. Zusätzlich werden von Cykla geplante
Erinnerungen entfernt und die App-Sperre deaktiviert.

SQLite kann gelöschte Seiten technisch vorübergehend im Dateisystem enthalten, bis
das Betriebssystem Speicherbereiche wiederverwendet. Vor einem produktiven Release
sind Secure-Deletion-Anforderungen und verschlüsselte Datenträger-Backups gesondert
zu prüfen.

## Nicht erhobene Daten

Das MVP erhebt oder überträgt insbesondere keine:

- E-Mail-Adresse oder Kontodaten
- Werbe-ID
- Kontakte oder Standortdaten
- Gesundheitsdaten an Analyse- oder Werbedienste
- biometrischen Merkmale

## Sicherheitsgrenzen

Die lokale SQLite-Datenbank ist in diesem MVP nicht zusätzlich feldweise
verschlüsselt. Der Schutz hängt von der Gerätesicherheit, dem Betriebssystem und
optionaler App-Sperre ab. Für eine Veröffentlichung sind mindestens Bedrohungsmodell,
Datenschutz-Folgenabschätzung, Geräte-Backup-Konzept, Penetrationstest und Prüfung
nach DSGVO und Medizinprodukterecht erforderlich.

Sicherheitsprobleme sollten nicht öffentlich mit echten Gesundheitsdaten gemeldet
werden. Verwende für reproduzierbare Beispiele ausschließlich künstliche Daten.
