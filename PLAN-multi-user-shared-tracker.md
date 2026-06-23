# Plan: Shared workout tracker for 7 people (no login, mobile-first)

**Goal:** All 7 family members see everyone’s weekly progress on **one page**, jump to their own table via **tabs**, and open a personal link that **scrolls straight to their section** — no accounts or passwords yet.

**Starting point:** You already have a working Vite app with a Mon–Sun table, checkbox + workout fields, and mobile-friendly styling. Data today lives only in each browser’s `localStorage`, so nobody else can see or sync anything.

**What this plan does *not* include (by your choice):** login, multi-week history UI, or admin dashboards. We keep scope tight so you can ship quickly and get feedback this week.

---

## Recommended approach (fastest path that still scales)

| Piece | Recommendation | Why |
|-------|----------------|-----|
| **Frontend** | Keep your existing Vite app; deploy to **Vercel** or **Netlify** (free) | You already built it; both give you HTTPS + a phone-friendly URL in ~10 minutes |
| **Database + API** | **Supabase** (free tier, ~$0 to start) | Postgres database + instant REST API + real-time optional; no backend code required for v1 |
| **Multi-user without login** | **One shared page** + **tabs** + **personal links** that scroll to a section (e.g. `yoursite.com/#sami`) | Everyone sees each other’s progress; tabs make “my table” one tap; slug links still feel personal |
| **Week scope** | Store **one active week** per person in the DB | Matches “1 week at a time”; you can add history later |

**Rough time:** 2–4 hours of focused work to go live, then 15 minutes to text links to the group.

**Rough cost:** $0/month on free tiers until you outgrow them. If you want a custom domain later (~$12/year), that’s optional.

---

## Phase 1 — People, slugs, shared content (done)

Everyone gets the **same table structure and goals**; only the **display name** differs.

| Display name | Slug (URL hash) | Section id |
|--------------|-----------------|------------|
| Samo | `samo` | `#samo` |
| Safi | `safi` | `#safi` |
| Sami | `sami` | `#sami` |
| Siraj | `siraj` | `#siraj` |
| Simrah | `simrah` | `#simrah` |
| Mama | `mama` | `#mama` |
| Baba | `baba` | `#baba` |

**Shared goals** (same for all 7):

1. Exercise 3–4 times this week
2. Do the same amount as last week or improve it incrementally

**Shared reminder** (same for all 7):

> Intentionally DO NOT try to do too much more than last week

**Shared week:** One calendar week for everyone — `week_start` = Monday of the current week (computed the same way as `getWeekStartMonday()` in `storage.js`).

**Personal link format** (scrolls to their table on the shared page):

```
https://your-app.vercel.app/#sami
https://your-app.vercel.app/#mama
```

Optional query form also works and is easier to read in texts:

```
https://your-app.vercel.app/?p=sami
```

On load, the app reads `?p=` or `#slug`, activates that person’s tab, and scrolls their section into view.

**Deliverable:** ✅ Roster locked — 7 people, 7 slugs, identical goals/reminder/table columns.

---

## Phase 2 — Set up the database (30–45 min)

### 2.1 Create Supabase project

1. Go to [supabase.com](https://supabase.com) → New project.
2. Choose a region close to you (e.g. US East if you’re in the US).
3. Save the **Project URL** and **anon public key** (you’ll put these in the app as env vars — never commit the service-role key to the frontend).

### 2.2 Database schema (one table, one row per person per week)

Use **one `people` table** and **one `week_entries` table**. Postgres keeps each person’s data separate via `person_id`; you do not need seven physical tables.

Run this in Supabase **SQL Editor**:

```sql
-- People (slug used for tabs, scroll targets, and personal links)
create table people (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  display_name text not null,
  sort_order smallint not null default 0,  -- tab order on the page
  created_at timestamptz default now()
);

-- One row per person per week
create table week_entries (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  week_start date not null,
  days jsonb not null,
  updated_at timestamptz default now(),
  unique (person_id, week_start)
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger week_entries_updated_at
  before update on week_entries
  for each row execute function set_updated_at();
```

**JSON shape for `days`:**

```json
{
  "Mon":  { "workedOut": false, "workoutsDone": "", "workoutsPlanned": "" },
  "Tues": { "workedOut": true,  "workoutsDone": "Run 3mi", "workoutsPlanned": "Leg day" },
  ...
}
```

Goals and reminder are **not** stored per person in the DB for v1 — they’re identical and live in the app as shared constants. Only names and weekly row data vary per person.

### 2.3 Seed all 7 people

```sql
insert into people (slug, display_name, sort_order) values
  ('samo',   'Samo',   1),
  ('safi',   'Safi',   2),
  ('sami',   'Sami',   3),
  ('siraj',  'Siraj',  4),
  ('simrah', 'Simrah', 5),
  ('mama',   'Mama',   6),
  ('baba',   'Baba',   7);
```

Optionally pre-create empty `week_entries` rows for this Monday’s `week_start` for all 7, or let the app upsert on first edit.

### 2.4 Row Level Security

For v1 with a trusted family group and no login:

- Enable RLS on both tables.
- Allow **read** on `people` and `week_entries` for everyone (anon key).
- Allow **update/insert** on `week_entries` for everyone (anon key).

Anyone with the site URL can edit any row — acceptable for 7 trusted people on one page where everyone already sees everything. Tighten with auth later if needed.

**Deliverable:** 7 rows in `people`; `week_entries` ready for the current `week_start`.

---

## Phase 3 — Connect the app to the database (1–2 hours)

### 3.1 Add Supabase client

```bash
npm install @supabase/supabase-js
```

Create `.env.local` (gitignored):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 3.2 Single-page layout: tabs + all 7 tables

**One URL for everyone:** `https://your-app.vercel.app/`

**Page structure:**

```
┌─────────────────────────────────────────┐
│  [Samo] [Safi] [Sami] [Siraj] …         │  ← sticky tab bar (horizontal scroll on phone)
├─────────────────────────────────────────┤
│  ▼ Samo’s section (#samo)               │
│     header + goals + table              │
├─────────────────────────────────────────┤
│  ▼ Safi’s section (#safi)             │
│     …                                   │
├─────────────────────────────────────────┤
│  … all 7 sections stacked …             │
└─────────────────────────────────────────┘
```

**Tab behavior:**

- Tap a tab → smooth-scroll that section to top (below sticky tabs); set active tab styling.
- On load with `?p=sami` or `#sami` → activate Sami’s tab and scroll to `#sami`.

**Why stack all tables instead of hiding others:** Everyone can scroll and see each other’s checkboxes and notes without switching modes — that’s the accountability feature you want.

### 3.3 Replace `localStorage` with Supabase

| Current (`storage.js`) | New behavior |
|------------------------|--------------|
| `loadData()` | Load all 7 `people` + their `week_entries` for current `week_start` in one query |
| `updateDay()` | Upsert that person’s `week_entries.days[day]` |
| `createEmptyWeek()` | Default shape uses `workoutsDone` + `workoutsPlanned` |

**UX details for phones:**

- **Debounce** textarea saves (~300–500 ms).
- **Optimistic UI:** update immediately; revert if save fails.
- Tiny **“Saved”** indicator per section or global.
- Optional: **Supabase realtime** on `week_entries` so when Mama checks a box, others see it without refreshing (nice polish, not required for v1).

### 3.4 Workouts Done vs Workouts Planned — status

**HTML:** ✅ Fixed — Done and Planned read from `entry.workoutsDone` and `entry.workoutsPlanned`.

**Save handlers:** ⚠️ Not fully fixed yet. Two issues in `app.js`:

1. `row.querySelector('.workout-input')` only selects the **first** textarea (Done). Planned has no listener.
2. `updateDay(..., { workoutsDone: ... }, { workoutsPlanned: ... })` passes a **second object** that `updateDay` ignores — it only accepts one `updates` argument.

**Correct pattern** (apply when wiring event listeners for each person’s table):

```javascript
const doneInput = row.querySelector('.workout-done');
const plannedInput = row.querySelector('.workout-planned');

doneInput.addEventListener('input', () => {
  updateDay(data, weekStart, personId, day, { workoutsDone: doneInput.value });
});

plannedInput.addEventListener('input', () => {
  updateDay(data, weekStart, personId, day, { workoutsPlanned: plannedInput.value });
});
```

Also update `createEmptyWeek()` in `storage.js`:

```javascript
week[day] = { workedOut: false, workoutsDone: '', workoutsPlanned: '' };
```

**Deliverable:** One deployed-ready page showing all 7 tables; tabs + slug scroll; edits persist to Supabase.

---

## Phase 4 — Deploy so phones can use it (20–30 min)

### 4.1 Host the frontend

1. Push the repo to GitHub (if not already).
2. Import the project in [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
3. Add env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
4. Deploy → you get `https://something.vercel.app`.

### 4.2 Mobile polish

Before sharing links, verify on a real phone:

- [ ] Viewport meta tag present (`width=device-width`) — add to `index.html` if missing.
- [ ] Tab bar sticky + horizontally scrollable on narrow screens.
- [ ] Each table scrolls horizontally inside `.table-wrap` if needed.
- [ ] Checkboxes and textareas easy to tap (~44px touch targets).
- [ ] Slug link (`/#sami`) lands on the right section after deploy.

### 4.3 Share links

Send **one group link** plus **personal scroll links**:

> Everyone’s on one page — you can see all our progress. Bookmark yours:  
> `https://your-app.vercel.app/#sami`

Or one message to the group chat with the main URL; each person bookmarks their `#slug`.

**Deliverable:** One shared HTTPS URL + 7 optional personal hash links, all usable on iPhone/Android.

---

## Phase 5 — Get feedback from the group *this week* (ongoing)

### 5.1 What to ask them (keep it short)

After 2–3 days of use, ask everyone the same 3 questions:

1. **Friction:** Was opening and updating on your phone annoying? (1–5)
2. **Clarity:** Did you understand what to fill in each day?
3. **Motivation:** Did seeing everyone’s tables on one page help?

### 5.2 Your role as owner

- Glance at the shared page daily (no separate admin view needed).
- Nudge privately if someone’s row is empty mid-week.
- Log bugs (slow save, wrong tab on link open, etc.) for the next iteration.

### 5.3 Success criteria

- [ ] All 7 have opened the page at least once on a phone.
- [ ] At least 5 have edited something (checkbox or text).
- [ ] You’ve collected replies to the 3 questions above.

**Deliverable:** Real usage data + feedback to decide what to build next.

---

## Phase 6 — What to build next (after feedback, not before)

| If they say… | Next build |
|--------------|------------|
| “I forget to open it” | SMS/reminder or weekly iCal |
| “Someone edited my row” | Per-person edit token or Supabase Auth magic links |
| “I need last week” | Keep multiple `week_start` rows; add week picker |
| “Updates don’t show live” | Supabase realtime on `week_entries` |
| “Too much scrolling” | Tabs that collapse other sections (optional toggle) |

---

## Implementation checklist (copy/paste)

- [x] **Phase 1:** 7 names, slugs, shared goals/reminder
- [ ] **Phase 2:** Supabase project + SQL schema + seed 7 people
- [ ] **Phase 2:** RLS policies
- [ ] **Phase 3:** `@supabase/supabase-js` + env vars
- [ ] **Phase 3:** Single page — 7 stacked sections + sticky tab bar
- [ ] **Phase 3:** `?p=` / `#slug` scroll + active tab on load
- [ ] **Phase 3:** Load/save all `week_entries` via Supabase
- [ ] **Phase 3:** Fix Done/Planned save listeners + `createEmptyWeek()`
- [ ] **Phase 3:** Debounced save + “Saved” indicator
- [ ] **Phase 4:** Deploy to Vercel/Netlify
- [ ] **Phase 4:** Test on phone — tabs, scroll links, edits sync
- [ ] **Phase 5:** Share links + collect feedback

---

## Security expectations (honest summary)

**No login means anyone with the URL can view and edit any row.** For 7 trusted family members who all see the same page anyway, that’s usually fine for v1.

**Do not** put the Supabase **service role** key in the frontend.

---

## Summary

1. **One page:** All 7 tables stacked; everyone sees everyone’s progress.
2. **Tabs:** Sticky bar to jump to your section quickly on mobile.
3. **Personal links:** `#slug` or `?p=slug` scrolls to your table — not separate pages.
4. **Database:** Supabase `people` + `week_entries`; same goals in the app, names only differ in DB.
5. **One week:** Single `week_start` per person; no week picker yet.
6. **Phones:** Deploy HTTPS; share main URL + personal hash links.

See **`PLAN-whats-next.md`** for the concrete implementation order starting from your current codebase.
