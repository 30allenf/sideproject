# MOGSCORE

Live face scan. Six categories. One score out of ten. Posted to a global leaderboard.

For entertainment only. Video never leaves your browser.

```
mmxxvi · heavyweight division
```

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind v4
- **@mediapipe/tasks-vision** FaceLandmarker (478 landmarks, GPU/CPU fallback, runs on main thread)
- **Framer Motion** for the analysis theater + result reveals
- **Supabase** for the public leaderboard (optional — local fallback when no env)
- **html-to-image** for the downloadable share card
- Aesthetic: tournament arena / boxing weigh-in. Bebas Neue + Anton + JetBrains Mono. Black + blood-red + championship gold.

## Run

```bash
npm install
npm run dev
# → http://localhost:3000
```

`/` is the full single-page flow. `/leaderboard` is the rankings page.

## Flow

1. **Landing** → ENTER THE ARENA
2. **Name** → 2–20 chars, basic profanity filter
3. **Mode** → Face (live), Body & Combine (coming in v2)
4. **Capture** → webcam preview with oval guide; live coaching cues turn gold when met
   (Centered · Straight · Lit · Still); auto-fires a 3-2-1 countdown when all green for ~1.5s
5. **Analysis Theater** → 3.5-second cinematic reveal of landmarks + scan line + category lights
6. **Results** → overall score, tier label, six stat cards with deadpan verdicts, fight-card
   portrait, downloadable share PNG, auto-submit to leaderboard
7. **Rescan** loops back to Mode

## Scoring

All math lives in [src/lib/face-scoring.ts](src/lib/face-scoring.ts). Comments explain
each metric. Calibrated so most real faces land 5–8. Floor at 3.0.

| Category   | Signal |
|------------|--------|
| Eyes       | Canthal tilt + eye spacing + eye-to-face ratio |
| Skin       | Luminance variance + LAB stddev over cheek + forehead patches |
| Jawline    | Chin angle from jaw-corner landmarks + jaw curvature smoothness |
| Hair       | Coverage % above forehead vs. skin reference |
| Symmetry   | Mirror-pair landmarks across the face midline; mean displacement |
| Harmony    | Facial thirds + fifths, deviation from equal |

Tune by adjusting the `mapTo10(value, idealLow, idealHigh, fullRange, curve)` calls.

## Public leaderboard (Supabase, optional)

By default scores are saved to **localStorage** (this device only). To enable a real
public leaderboard:

### 1. Create a Supabase project

[supabase.com](https://supabase.com) → New Project (free tier).

### 2. Add the table

In the SQL Editor:

```sql
create table entries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mode text not null check (mode in ('face','body','combine')),
  photo_url text,
  body_photo_url text,
  overall numeric not null,
  eyes numeric, skin numeric, jawline numeric, hair numeric,
  symmetry numeric, harmony numeric,
  frame numeric, vtaper numeric, posture numeric, proportions numeric,
  body_symmetry numeric, stance numeric, abs numeric, muscle_def numeric,
  created_at timestamptz default now(),
  ip_hash text
);

alter table entries enable row level security;

create policy "public can read" on entries for select using (true);
create policy "public can insert" on entries for insert with check (true);
```

### 3. `.env.local`

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Restart `npm run dev`. The leaderboard now persists globally. The "Public/Local"
badge in the leaderboard header reflects which mode is active.

### 4. (Optional) rate-limit by IP

Photo dataURLs are stored inline in the `photo_url` column for v1. For v2, swap
to a Storage bucket and add a Postgres trigger or edge function that hashes the
caller IP and rejects more than 10 inserts per hour.

## v2 roadmap

- **Body mode** — `PoseLandmarker` (33 landmarks) + selfie segmentation, eight
  categories: Frame, V-Taper, Posture, Proportions, Symmetry, Stance, Abs,
  Muscle Definition. Skin-exposure gate keeps Abs/Muscle Def honest when clothed.
- **Combine mode** — face scan, "now step back" transition, body scan, weighted
  60/40 overall. Posts to all three boards.
- **Mog button** on each leaderboard row — flips the camera back on for a
  rematch challenge.
- **Pinned current-user row** in the leaderboard even at rank 4,728.
- **Storage bucket** for photos instead of base64.
- **Edge-function rate limiter**.

## Notes on the analysis theater

The 3.5-second sequence in [src/components/AnalysisTheater.tsx](src/components/AnalysisTheater.tsx)
is timing-staged:

- 0.0–2.6s — vertical scan line sweeps top to bottom
- 0.4–2.0s — landmark dots fade in staggered
- 1.0s onwards — category labels light up every 380ms (six categories, ~2.3s)
- ~3.3s — `onDone` fires, transitions to results

Scoring runs synchronously the moment the frame is captured; the theater is purely
dramatic delay. Adjust the timings inline if you want a longer or shorter beat.

## Files

```
src/
├── app/
│   ├── layout.tsx              fonts + grain overlay
│   ├── globals.css             design tokens + buttons + cards + grain anim
│   ├── page.tsx                screen state machine
│   └── leaderboard/page.tsx    rankings (face tab live, body/combine soon)
├── components/
│   ├── GrainOverlay.tsx
│   ├── LandingScreen.tsx
│   ├── NameScreen.tsx
│   ├── ModeScreen.tsx
│   ├── CaptureScreen.tsx       camera + cues + countdown
│   ├── AnalysisTheater.tsx     cinematic 3.5s reveal
│   ├── ResultsScreen.tsx       score + tier + stats + share card download
│   └── StatCard.tsx
└── lib/
    ├── face-scoring.ts         all the math, isolated and tuneable
    ├── face-landmarker.ts      MediaPipe wrapper
    ├── verdicts.ts             deadpan one-liners
    ├── photo.ts                capture/crop/encode + alignment cues
    ├── profanity.ts            tiny blocklist for name field
    └── backend.ts              localStorage default, Supabase swap-in
```

## License

MIT. For entertainment only.
