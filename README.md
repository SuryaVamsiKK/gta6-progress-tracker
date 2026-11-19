# Leonida 100% Tracker

An unofficial, fan-made GTA VI progression tracker built from `GTA6_Progress_Tracker.xlsx`.
It's a static site (plain HTML/CSS/JS, no build step) in `site/`.

## Run it

```bash
py -m http.server 5173 --directory site
```

Then open http://localhost:5173. You can also host the `site/` folder on any static host (GitHub Pages, Netlify, etc.).

## What's inside

| Tab | From sheet | What you can do |
|---|---|---|
| HQ | Dashboard | Overall %, wanted-level stars and rank, switch between the 45/45/10 and equal-per-line weighting, see the lines closest to done |
| 100% | 100% Checklist | Game-menu-style rows with a detail panel; ↑ ↓ to select, ← → to adjust |
| Story | Story Missions | Chapter cards, one-click check (empty → ✔ completed → ✖ missed), character-locked missions tagged automatically, search, bulk-complete a chapter |
| Collectibles | Collectibles | Steppers or typed counts per item, hide completed |
| Challenges | Challenges | Click pips to set progress; vehicle unlocks light up at 5 and 10 (feeds the checklist automatically) |
| Leonida | Regions | Stylised map plus sliders for explored % |
| Trophies | Trophies + `tools/extra_data.json` | All 55 trophies as a checklist by tier and group; story trophies, A Long Road, One Last Thing and the Platinum tick themselves |
| Intel | Sources & Notes | Sources, caveats, export/import/reset your save |

Keyboard: `Q`/`E` switch tabs, `1`–`8` jump, `Esc` returns to the title screen.

Progress is saved in your browser's localStorage. Use **Intel → Export backup** to move it between browsers.

## Updating the data

When you edit the spreadsheet (new totals, extra missions, etc.), regenerate the site data:

```bash
py -m pip install openpyxl
py tools/build_data.py
```

That rewrites `site/data.js`. It also merges `tools/extra_data.json`, which holds data that isn't in the sheet: which missions are locked to Jason or Lucia (by mission #) and the full trophy list with tiers (both from PowerPyx, 18 Nov 2026). If you renumber missions in the sheet, update the numbers there too. Your saved progress is kept, because it's stored by line number / item name.
