# 🗺️ CampusQuest

A gamified campus exploration app built for a 24-hour hackathon demo.

## Quick Start

```bash
npm install
npm run dev
```

## Demo Instructions

1. Open app → see Home page with XP, level, quest list
2. Tap a quest card → Quest Detail page
3. Tap **"Scan to Unlock"** → QR scanner opens
4. For demo: tap **"Enter code manually"** → click a code chip or type one
5. Watch the animated Reward Popup appear!
6. Puzzle pieces fill in on the home screen

## QR Code Values

| Location | QR Value |
|---|---|
| Baillieu Library | `quest_baillieu` |
| Arts West | `quest_artswest` |
| Old Quadrangle | `quest_oldquad` |
| Student Pavilion | `quest_pavilion` |
| South Lawn | `quest_southlawn` |
| MSD Building | `quest_msd` |

Generate printable QR codes at https://qrcode-monkey.com

## Tech Stack
- React + Vite
- html5-qrcode
- localStorage
- Custom CSS animations
