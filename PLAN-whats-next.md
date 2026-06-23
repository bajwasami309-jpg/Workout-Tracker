# What’s next — implementation guide

You’ve locked the product shape: **one shared page**, **7 people**, **tabs + scroll links**, **Supabase**, **no login**. The main plan lives in [`PLAN-multi-user-shared-tracker.md`](./PLAN-multi-user-shared-tracker.md).

This document is your **execution order** — do these steps in sequence. Each step says what to change, which file, and how you’ll know it’s done.

---

## Before you start (5 min)

**Fix the Workouts Done / Planned bug locally** — your HTML is correct; saves are not yet.

| Issue | Where | Fix |
|-------|-------|-----|
| Empty week still uses old `workouts` field | `src/storage.js` → `createEmptyWeek()` | Use `{ workedOut: false, workoutsDone: '', workoutsPlanned: '' }` |
| Only first textarea has a listener | `src/app.js` → event listeners | Give each textarea a distinct class (`workout-done`, `workout-planned`); attach **two** listeners |
| Second argument to `updateDay` is ignored | `src/app.js` line 98 | One field per call: `{ workoutsDone: ... }` or `{ workoutsPlanned: ... }` |

**Verify:** Type different text in Done vs Planned, refresh the page — both values should stick (localStorage for now).

---

## Step 1 — Supabase setup (~30 min)

**You do this in the browser** (supabase.com):

1. Create a project.
2. Open **SQL Editor** → paste schema + seed from Phase 2 of the main plan.
3. Confirm **Table Editor** shows 7 rows in `people`.
4. Copy **Project URL** and **anon public key** from Settings → API.

**Done when:** 7 people exist in Supabase; you have URL + anon key saved locally.

---

## Step 2 — Wire up the app to Supabase (~45 min)

### 2a. Install + env

```bash
npm install @supabase/supabase-js
```

Create `.env.local`:

```
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Add `.env.local` to `.gitignore` if it isn’t already.

### 2b. New file: `src/supabase.js`

- Create Supabase client from `import.meta.env.VITE_SUPABASE_*`.
- Export helpers:
  - `fetchAllWeekData(weekStart)` → all people ordered by `sort_order` + their `week_entries` for that week (or empty week if missing).
  - `saveDay(personId, weekStart, day, updates)` → upsert merged `days` JSON.

### 2c. Refactor `src/storage.js`

- Keep: `DAYS`, `formatDate`, `getWeekStartMonday`, `getTodayIndex`, `createEmptyWeek` (with Done/Planned fields).
- Remove or bypass: `localStorage` read/write for production path.
- `createEmptyWeek()` stays the default when no DB row exists yet.

**Done when:** You can call `fetchAllWeekData` from the browser console (temporary test in `main.js`) and see 7 people.

---

## Step 3 — Multi-person UI on one page (~1–2 hours)

This is the biggest code change. Refactor `src/app.js`.

### 3a. Shared constants (top of file or `src/constants.js`)

```javascript
export const SHARED_GOALS = [
  'Exercise 3–4 times this week',
  'Do the same amount as last week or improve it incrementally',
];
export const SHARED_REMINDER =
  'Intentionally DO NOT try to do too much more than last week';

export const PEOPLE = [
  { slug: 'samo',   name: 'Samo' },
  { slug: 'safi',   name: 'Safi' },
  { slug: 'sami',   name: 'Sami' },
  { slug: 'siraj',  name: 'Siraj' },
  { slug: 'simrah', name: 'Simrah' },
  { slug: 'mama',   name: 'Mama' },
  { slug: 'baba',   name: 'Baba' },
];
```

(Slugs must match Supabase `people.slug`.)

### 3b. Page layout

Replace single-person render with:

1. **Sticky tab bar** — one button per person; `data-slug="sami"` etc.
2. **Seven `<section id="sami">` blocks** — each contains the header (name + shared goals + reminder) and tracker table you already have.
3. Reuse your existing table row template inside a loop over `PEOPLE`.

### 3c. Tab + scroll behavior

On tab click:

- `document.getElementById(slug).scrollIntoView({ behavior: 'smooth', block: 'start' })`
- Set active tab class.

On page load:

- Read slug from `new URLSearchParams(location.search).get('p')` **or** `location.hash.slice(1)`.
- If valid slug → activate tab + scroll after render.

Update URL optionally with `history.replaceState` so sharing reflects current tab (optional).

### 3d. Event listeners

For **each** section, attach listeners with `personId` in closure:

- Checkbox → `{ workedOut: checked }`
- Done textarea → `{ workoutsDone: value }`
- Planned textarea → `{ workoutsPlanned: value }`

Debounce textarea saves (300–500 ms) before calling `saveDay`.

### 3e. Styles (`src/style.css`)

Add:

- `.tabs` — sticky top, horizontal scroll, flex row, gap, dark background
- `.tab--active` — accent border/background
- `.person-section` — spacing between stacked tables; `scroll-margin-top` equal to tab bar height so scroll-into-view doesn’t hide the header under tabs

**Done when:** Running `npm run dev` shows all 7 tables, tabs scroll correctly, `/#sami` opens on Sami’s section.

---

## Step 4 — Load data on startup (~20 min)

Update `src/main.js`:

```javascript
import { renderApp } from './app.js';
import { fetchAllWeekData } from './supabase.js';
import { getWeekStartMonday } from './storage.js';

const app = document.getElementById('app');
app.textContent = 'Loading…';

const weekStart = getWeekStartMonday();
const peopleData = await fetchAllWeekData(weekStart);
renderApp(app, { weekStart, peopleData });
```

Show a simple error state if Supabase fails (missing env vars, network).

**Done when:** Refresh loads all 7 tables from Supabase; checkbox toggle survives refresh.

---

## Step 5 — Mobile + deploy (~30 min)

### 5a. Quick mobile fixes

In `index.html`, ensure:

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

Test on your phone via local network (`npm run dev -- --host`) or after deploy.

### 5b. Deploy

1. Push to GitHub.
2. Vercel or Netlify → import repo.
3. Set env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
4. Deploy.

### 5c. Share

- Group: `https://your-app.vercel.app/`
- Personal: `https://your-app.vercel.app/#sami` (etc.)

**Done when:** Phone on cellular data (not Wi‑Fi localhost) can load, edit, and see others’ data.

---

## Step 6 — Feedback loop (this week)

After 2–3 days, send the 3 questions from Phase 5 of the main plan to the group.

Track in a Notes doc or Google Form:

- Who opened the link
- Who filled in at least one day
- Answers to friction / clarity / motivation questions

**Done when:** You have written feedback from most of the group.

---

## Suggested file changes summary

| File | Action |
|------|--------|
| `src/storage.js` | Fix `createEmptyWeek`; keep date helpers |
| `src/supabase.js` | **New** — client + fetch/save |
| `src/constants.js` | **New** (optional) — `PEOPLE`, shared goals |
| `src/app.js` | Multi-section UI, tabs, scroll, fixed listeners |
| `src/main.js` | Async load from Supabase then render |
| `src/style.css` | Tabs + section spacing + scroll-margin |
| `index.html` | Viewport meta if missing |
| `.env.local` | Supabase keys (not committed) |
| `.gitignore` | Include `.env.local` |

---

## Order of work (at a glance)

```
Fix Done/Planned locally
    ↓
Supabase schema + seed 7 people
    ↓
supabase.js + env vars
    ↓
Multi-person app.js + CSS tabs
    ↓
main.js async load
    ↓
Test locally on phone
    ↓
Deploy Vercel/Netlify
    ↓
Text links to family
    ↓
Collect feedback end of week
```

---

## If you want help implementing

Say which step you’re on (e.g. “Step 3 — multi-person UI”) and we can do it together in the codebase. Steps 1–2 are mostly Supabase dashboard work on your side; Steps 3–5 are where most of the coding lives.
