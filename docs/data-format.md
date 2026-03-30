# Data format for `data/tournaments.json`

The app reads a single JSON array. Each item should look like this:

```json
{
  "id": "wsop-001",
  "series": "WSOP",
  "venue": "Horseshoe / Paris",
  "title": "Mystery Millions",
  "date": "2026-05-27",
  "time": "11:00",
  "buyIn": 1000,
  "game": "NLH",
  "tags": ["Huge field", "Good for volume"],
  "notes": "Flight A",
  "flights": "A / B / C / D",
  "url": "https://www.wsop.com/"
}
```

## Required fields
- `id`
- `series`
- `title`
- `date` in `YYYY-MM-DD`

## Strongly recommended
- `venue`
- `time` in `HH:MM` 24-hour format
- `buyIn` as a number
- `game`
- `tags` as an array of short strings
- `notes`
- `flights`
- `url`

## Why JSON instead of hardcoded HTML
This makes it easy to add new series later without changing the interface. Once WSOP, Wynn, Aria, Orleans, or anything else are normalized into this format, the UI will pick them up automatically.
