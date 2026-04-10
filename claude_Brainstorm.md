# Claude Brainstorm — GEMA Ideen-Sammlung

> Diese Datei dient als Sammelstelle für Ideen, die später umgesetzt werden sollen.
> Füttere mich (Claude) einfach mit neuen Ideen und ich speichere sie hier.
> Format: Datum, Kontext, Idee, ggf. Status.

---

## 🧠 Offene Ideen

### Offertvergleich mit Excel/PDF-Rücklauf
**Quelle:** Persona-Test #11
**Datum:** 2026-04-10
**Status:** Offen

Unternehmer schicken Offerten als Excel oder handausgefülltes PDF zurück — nicht über GEMA. Das System muss damit umgehen können.

**Mögliche Lösungen:**
- Auto-Match per Upload: Planer lädt Excel/PDF des Unternehmers hoch, GEMA matched Positionen automatisch (per Pos.-Nr.) und füllt Preise in den Vergleich ein. Bei PDF: OCR oder manuelle Zuweisung.
- GEMA-eigene Excel-Vorlage: Vorlage zum Download mit Pos.-Nr., Unternehmer füllt aus, Upload, Auto-Match
- Manuell kopieren als Fallback

**Offene Fragen:**
- OCR-Qualität bei handausgefüllten PDFs?
- Wie strikt ist der Pos.-Nr. Match (ähnliche Schreibweisen)?

---

### Sanierungsmodus mit Ist/Soll-Vergleich
**Quelle:** Persona-Test #18
**Datum:** 2026-04-10
**Status:** Offen

Bei Sanierungsprojekten ist der Workflow anders als bei Neubau: Es gibt einen Ist-Zustand (bestehende Installation, Baujahr, Material) und einen Soll-Zustand (geplante Sanierung). Beide Werte müssen erfasst und verglichen werden können.

**Mögliche Lösungen:**
- Toggle "Sanierung" in `pm_objekte.html`: aktiviert zusätzliche Felder Baujahr, Bestandsmaterial, Lebensdauer, bestehende Installation
- In Berechnungen vor Eingabe: "Ist-Wert / Soll-Wert"-Modus
- Side-by-Side-Anzeige: Ist links, Soll rechts, Differenz mittig
- Verbindung mit dem neuen Variantenvergleich (`gema_varianten.js`): Ist-Variante + Soll-Variante speichern

**Offene Fragen:**
- Soll der Sanierungsmodus per-Berechnung oder global per Objekt aktiviert werden?
- Welche Module brauchen Ist/Soll-Vergleich am dringendsten? (Druckdispositiv, Druckverlust, Enthärtung?)
- Gibt es typische Sanierungs-Szenarien, die als Vorlagen hinterlegt werden könnten?

---

### Unterprojekte / Etappen (Parent-Child-Baumstruktur)
**Quelle:** Persona-Test #25
**Datum:** 2026-04-10
**Status:** Entschieden — Parent-Child-Baumstruktur

Grosse Bauvorhaben (z.B. Spital, Areal-Entwicklung) laufen in mehreren Etappen über Jahre. Jede Etappe ist ein eigenständiges Teilprojekt mit eigenen Berechnungen, Ausschreibungen und Kosten, gehört aber zum selben Oberprojekt.

**Entscheidung:**
- In `pm_objekte.html` neues Feld `parentObjektId` (optional).
- Dashboard zeigt Objekte als Baum mit Einrückung (Parent → Kind → Enkelkind).
- Berechnungen und Ausschreibungen laufen pro Sub-Objekt (nutzen die bestehende `objektId`-Logik).
- Kosten-Rollup: Parent-Objekt zeigt aggregierte Summen aller Kinder.
- Navigation: Breadcrumb im Objekt-Header "Spital Musterhausen › Etappe 2 Rohbau".

**Offene Fragen:**
- Wie tief soll die Baumhierarchie gehen? (Empfehlung: max. 3 Ebenen)
- Kopier-Funktion: neues Sub-Objekt mit Vorlage aus Geschwister-Objekt übernehmen?
- Wie werden Beteiligte vererbt — Parent → Kind automatisch, oder pro Ebene separat?

---

### CRBX-Import — keine Freitext-Positionen
**Quelle:** Persona-Test #26
**Datum:** 2026-04-10
**Status:** Entschieden — keine Umsetzung nötig

NPK-Positionen werden in GEMA **nicht manuell angepasst** und es werden **keine freien Positionen hinzugefügt**. Die einzelnen NPK-Positionen kommen ausschliesslich über die `.crbx`-Schnittstelle (SIA 451 .e1s, Satztypen A/B/C/G/Z) in das System. GEMA ist NPK-read-only — die Stammdatenhoheit liegt bei CRB.

**Konsequenz:** Kein Freitext-Editor in `pm_ausschreibung.html`. Der Planer arbeitet mit dem importierten Positionsbaum, ohne die Möglichkeit, daneben eigene Zeilen einzufügen. Anpassungen erfolgen ausserhalb von GEMA im CRBX-Workflow und werden dann erneut importiert.

---

### Gleichzeitiges Arbeiten an einer Ausschreibung (Co-Working)
**Quelle:** Persona-Test #27
**Datum:** 2026-04-10
**Status:** Offen — Brainstorm, später entscheiden

Zwei Planer wollen parallel an derselben Ausschreibung arbeiten (z.B. einer füllt Sanitärapparate aus, der andere Rohre). Aktuell überschreibt der letzte Speichervorgang alle älteren Änderungen.

**Mögliche Lösungen:**
- **Polling + Zeilen-Sperre**: Alle 5s pollt der Client den Server nach Änderungen. Beim Edit einer Zeile wird sie für andere User gesperrt (mit Timeout). Bei Konflikt Warnhinweis "XY bearbeitet diese Zeile gerade".
- **Supabase Realtime**: Echte Live-Subscriptions, Live-Cursors ähnlich Google Docs, sofortige Updates. Technisch anspruchsvoller, aber UX deutlich besser.
- **Check-out / Check-in**: Planer "reserviert" einen Positionsblock (z.B. ganze Gruppe), andere sehen "in Bearbeitung durch XY".

**Offene Fragen:**
- Wie oft kommt paralleles Arbeiten in der Praxis wirklich vor? (Persona-Feedback einholen)
- Reicht Sperre auf Gruppen-Ebene (Block) oder muss es pro Zeile sein?
- Supabase Realtime kostet — lohnt sich das für die erwartete Nutzung?
- Wie wird Offline-Arbeit gehandhabt (PWA-Kontext)?

---

### Vorlagen-Bibliothek für Ausschreibungen (persönlich + unternehmensweit)
**Quelle:** Persona-Test #28
**Datum:** 2026-04-10
**Status:** Entschieden — zwei Ebenen mit Kennzeichnung

Planer haben oft Standard-Positionslisten, die sie immer wieder verwenden (z.B. "EFH-Neubau Basisausstattung"). Diese sollen als Vorlagen gespeichert und schnell in neue Ausschreibungen geladen werden können.

**Entscheidung:**
Zwei Vorlagen-Ebenen mit klarer visueller Kennzeichnung:

1. **Persönliche Vorlagen** (pro User)
   - Nur für den eingeloggten User sichtbar
   - Badge/Label: "Persönlich" oder User-Icon
   - Gespeichert unter User-ID

2. **Unternehmensweite Vorlagen** (pro Büro/Organisation)
   - Für alle User derselben Organisation sichtbar
   - Badge/Label: "Büro-Vorlage" oder Organisations-Icon
   - Gespeichert unter Organisations-ID
   - Bearbeitungsrecht: Admin oder Vorlagen-Owner

**UI-Konzept:**
- In `pm_ausschreibung.html` Button "Als Vorlage speichern" mit Auswahl der Ebene (persönlich / Büro).
- Neue Ausschreibung → Dialog "Vorlage wählen" mit zwei Tabs oder kombinierter Liste mit Badges.
- Suche/Filter nach Vorlagenname und Gebäudetyp.

**Offene Fragen:**
- Darf jeder User Büro-Vorlagen erstellen oder nur bestimmte Rollen (Admin, Senior-Planer)?
- Versionierung: Wenn eine Büro-Vorlage aktualisiert wird, bleiben alte Ausschreibungen unverändert?
- Verbindung mit #16 (Gebäudetyp-Vorlagen): Beide Systeme zusammenlegen oder getrennt?
- CRBX-Kontext (siehe #26): Vorlagen enthalten NPK-Positionsreferenzen, nicht die Positionen selbst — beim Laden werden sie per Schnittstelle gezogen.

---

### Ausschreibungs-Vorlagen pro Gebäudetyp (EFH/MFH/Schule)
**Quelle:** Persona-Test #16
**Datum:** 2026-04-10
**Status:** Offen — Filterung via #15 vorerst ausreichend

Vorlagen-Bibliothek mit typischen CRBX-Positionen pro Gebäudetyp:
- EFH-Neubau: ~40 Standard-Positionen (Sanitärapparate, Rohre, Armaturen)
- MFH-Neubau: ~120 Positionen (mit Steigleitungen, Wärmedämmung, Brandabschottungen)
- Badsanierung: ~25 Positionen (Demontage + Neubau bestehender Räume)
- Schule/Öffentlich: ~80 Positionen (mit Behindertengerechtigkeit, Hygiene-Spülungen)

**Aktueller Stand:** Filterung in sys_lieferanten.html (Region/Kategorie/SIA-Phase) bietet einen ersten Schritt — Lieferanten können nach Eignung gefiltert werden. Ein vollständiges Vorlagen-System wäre der nächste Ausbauschritt.

---
