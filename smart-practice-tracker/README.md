# 🎵 PracticeLog — Smart Music Practice Tracker

> Track sessions. Build streaks. Unlock achievements. Master your instrument.

**Live Demo:** [https://logwithus.vercel.app](https://logwithus.vercel.app)

---

## 📸 Overview

PracticeLog is a full-featured music practice tracking web app that helps musicians stay consistent, monitor progress, and achieve their musical goals. Built with vanilla HTML/CSS/JavaScript on the frontend and Supabase for auth, database, and file storage.

---

## ✨ Features

### 🔐 Authentication
- Email & Password Sign Up / Sign In
- Forgot Password with secure email reset link
- Email confirmation on signup
- Protected routes — unauthenticated users are redirected to login
- Session persistence across page refreshes

### 📊 Dashboard
- **Today's Practice** — total minutes logged today
- **This Week** — total minutes in the last 7 days
- **Total Sessions** — all-time session count
- **Best Day** — highest single-day practice total
- **Daily Goal Progress Bar** — visual progress toward your daily target
- **Weekly Bar Chart** — practice minutes per day for the last 7 days
- **Practice Heatmap** — GitHub-style activity heatmap (last 90 days)
- **Recent Achievements** — latest unlocked badges
- **Recent Sessions** — last 5 practice sessions

### 📋 Sessions
- View all practice sessions in a filterable list
- Filter by **Instrument**, **Mood**, and **Sort Order**
- Delete any session with one click
- Each session shows instrument, focus area, mood emoji, notes, duration, and date

### ⏱️ Log Practice
- **Practice Timer** — start, pause/resume, reset with live HH:MM:SS display
- Timer auto-fills the duration field
- Log **Instrument**, **Duration**, **Focus Area**, **Mood** (emoji selector), **Date**, **Notes**
- Focus areas: General, Scales & Exercises, Songs, Technique, Theory, Improvisation, Ear Training, Sight Reading
- Mood tracking: 😫 Hard → 😕 Tough → 😐 Okay → 🙂 Good → 😄 Great

### 📈 Analytics
- **Monthly Chart** — practice minutes across last 6 months
- **Instrument Breakdown** — horizontal bar chart showing % split per instrument
- **Day of Week Patterns** — which days you practice most
- **Full Year Heatmap** — 365-day practice activity grid
- **Summary Stats** — total practice time, average session, most practiced instrument, total practice days

### 🎯 Goals
- Create custom practice goals with title, instrument, daily target, and days/week
- Optional deadline setting
- Weekly progress bar showing current vs. target minutes
- Delete goals when completed

### 👤 Profile
- Upload a profile avatar (stored in Supabase Storage)
- Edit full name, username, bio
- Set daily practice goal (minutes)
- View personal stats: total sessions, total hours, current streak
- Full achievements grid

### 🏆 Achievements (10 Badges)
| Badge | Icon | Requirement |
|-------|------|-------------|
| Early Adopter | 🌟 | Join PracticeLog |
| First Note | 🎵 | Log your first session |
| Dedicated | 🎯 | 10 practice sessions |
| Committed | 🏆 | 50 practice sessions |
| Legend | 👑 | 100 practice sessions |
| Week Warrior | 🔥 | 7-day practice streak |
| Monthly Master | ⚡ | 30-day practice streak |
| Marathon | ⏱️ | Single session 60+ minutes |
| Versatile | 🎸 | Practice 3+ different instruments |
| Century | 💯 | 100+ total hours practiced |

### 📱 Mobile Responsive
- Hamburger menu with animated icon
- Slide-in sidebar with overlay backdrop
- Fully responsive grid layouts at all breakpoints
- Touch-friendly buttons and selectors

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, Vanilla CSS, Vanilla JavaScript (ES2020+) |
| Backend / Auth | [Supabase](https://supabase.com) (Auth, PostgreSQL, Storage) |
| Local Dev Server | Node.js + Express |
| Fonts | Google Fonts — Inter |
| Hosting | [Vercel](https://vercel.com) |
| Supabase SDK | `@supabase/supabase-js` v2 (via CDN) |

---

## 🗂️ Project Structure

```
smart-practice-tracker/
│
├── client/                      # All frontend files
│   ├── index.html               # Auth page (Sign In / Sign Up)
│   ├── app.html                 # Main application (protected)
│   ├── callback.html            # Supabase auth callback handler
│   ├── terms.html               # Terms & Conditions page
│   │
│   ├── css/
│   │   ├── style.css            # Main app styles
│   │   └── auth.css             # Auth page styles
│   │
│   └── js/
│       ├── supabase-client.js   # Supabase client initialization
│       ├── auth.js              # Sign in / Sign up / Reset password logic
│       └── app.js               # Full app logic (sessions, analytics, goals, etc.)
│
├── server.js                    # Express static file server (local dev only)
├── vercel.json                  # Vercel deployment configuration
├── package.json                 # Node.js dependencies
├── .env                         # Environment variables (local only, not committed)
└── README.md
```

---

## 🗄️ Database Schema (Supabase)

### `profiles`
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | References `auth.users` |
| `username` | TEXT (unique) | Public username |
| `full_name` | TEXT | Display name |
| `bio` | TEXT | Short biography |
| `avatar_url` | TEXT | Supabase Storage URL |
| `daily_goal_minutes` | INTEGER | Daily practice target |
| `created_at` | TIMESTAMPTZ | Join date |

### `sessions`
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `user_id` | UUID (FK) | References `auth.users` |
| `instrument` | TEXT | Guitar, Piano, etc. |
| `duration` | INTEGER | Minutes practiced |
| `date` | DATE | Practice date |
| `notes` | TEXT | Session notes |
| `mood` | INTEGER (1–5) | Session mood rating |
| `focus_area` | TEXT | scales, songs, technique, etc. |
| `created_at` | TIMESTAMPTZ | When logged |

### `streaks`
| Column | Type | Description |
|--------|------|-------------|
| `user_id` | UUID (unique FK) | References `auth.users` |
| `current_streak` | INTEGER | Current consecutive days |
| `longest_streak` | INTEGER | All-time best streak |
| `last_practice_date` | DATE | Most recent session date |
| `total_practice_days` | INTEGER | Lifetime practice days |

### `goals`
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `user_id` | UUID (FK) | References `auth.users` |
| `title` | TEXT | Goal description |
| `instrument` | TEXT | Optional instrument filter |
| `target_minutes_per_day` | INTEGER | Daily minute target |
| `target_days_per_week` | INTEGER | Days per week target |
| `deadline` | DATE | Optional deadline |
| `is_active` | BOOLEAN | Active/deleted flag |

### `achievements`
| Column | Type | Description |
|--------|------|-------------|
| `user_id` | UUID (FK) | References `auth.users` |
| `achievement_key` | TEXT | Unique badge identifier |
| `achievement_name` | TEXT | Display name |
| `unlocked_at` | TIMESTAMPTZ | When earned |

> **Row Level Security** is enabled on all tables — users can only access their own data.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org) v18+
- A [Supabase](https://supabase.com) account (free tier works)

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/smart-practice-tracker.git
cd smart-practice-tracker
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up Supabase
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the full schema from [`supabase_schema.sql`](#) (see below)
3. Go to **Authentication → URL Configuration** and set:
   - **Site URL:** `http://localhost:8080`
   - **Redirect URLs:** `http://localhost:8080/**`

### 4. Configure environment variables
Create a `.env` file in the project root:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
PORT=8080
```

Also update `client/js/supabase-client.js` with your actual keys:
```js
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

### 5. Run locally
```bash
npm start
```
Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## 🗄️ Supabase SQL Setup

Run this in your **Supabase SQL Editor** (Project → SQL Editor → New Query):

```sql
-- Create all tables, RLS policies, storage bucket, and triggers
-- (Full schema file provided separately as supabase_schema.sql)
```

The schema includes:
- ✅ All 5 tables with proper types and constraints
- ✅ Row Level Security policies on every table
- ✅ Public `avatars` storage bucket with per-user folder policies
- ✅ Auto-create `profiles` + `streaks` row on user signup (trigger)
- ✅ `updated_at` auto-update triggers
- ✅ Performance indexes on join columns

---

## 🌐 Deploying to Vercel

### Option A — Files uploaded directly to repo root
If you uploaded `index.html`, `app.html`, etc. directly to your repo root:

1. Go to **Vercel → Project → Settings → General**
2. **Root Directory** → leave **empty**
3. **Framework Preset** → `Other`
4. Click **Save** → **Redeploy**

### Option B — Full project with client/ folder
If your repo has the full `client/` folder structure:

1. Go to **Vercel → Project → Settings → General**
2. **Root Directory** → type `client`
3. Click **Save** → **Redeploy**

### Update Supabase for Production
Go to **Supabase → Authentication → URL Configuration**:
- **Site URL:** `https://yourapp.vercel.app`
- **Redirect URLs:** Add `https://yourapp.vercel.app/**` and `http://localhost:8080/**`

---

## 📧 Email Templates

Two custom branded email templates are configured in Supabase:

**Confirm Signup** → Sent when user registers  
**Reset Password** → Sent when user requests password reset

Both emails:
- Match PracticeLog's dark purple brand (#7c6af7)
- Use fully inline CSS (compatible with Gmail, Outlook, Apple Mail)
- Include the `{{ .ConfirmationURL }}` placeholder (Supabase auto-fills)
- Route through `/callback.html` which handles the token exchange

---

## 🔄 Auth Flow

```
Sign Up
  └─→ Supabase sends confirmation email
        └─→ User clicks link → /callback.html
              └─→ SIGNED_IN event → redirect to /app.html ✅

Forgot Password
  └─→ Supabase sends reset email
        └─→ User clicks link → /callback.html
              └─→ PASSWORD_RECOVERY event → show "Set New Password" form
                    └─→ User submits → redirect to /app.html ✅
```

---

## 🔒 Security

- All database tables have **Row Level Security (RLS)** — users can never access other users' data
- Avatar uploads are restricted to the user's own folder (`{user_id}/avatar.ext`)
- Auth tokens managed entirely by Supabase (no manual JWT handling)
- Anon key is safe to use client-side (it's a public key by design)
- Environment variables used for local development
- Security headers added via `vercel.json` (`X-Frame-Options`, `X-XSS-Protection`, etc.)

---

## 🧩 Key Implementation Details

### Client-Side Supabase (No Backend Needed)
All data operations go directly from the browser to Supabase using the JS SDK. The Express server is only used for local development to serve static files.

### Dynamic Redirect URLs
```js
redirectTo: window.location.origin + '/callback.html'
// Automatically works on both localhost:8080 and logwithus.vercel.app
```

### Streak Calculation
Streaks are calculated by comparing the new session's date with `last_practice_date`:
- **Same day** → no change (already practiced today)
- **1 day gap** → increment streak by 1
- **2+ day gap** → reset streak to 1

### Heatmap Rendering
The practice heatmap groups sessions by date into a week × day grid, calculates intensity levels (0–4) based on minutes relative to the user's maximum day, and renders HTML cells with CSS classes `l0`–`l4`.

### Achievement Detection
After every session save, the app checks all 10 achievement conditions against the current data and batch-inserts any newly unlocked achievements using Supabase's `upsert` with `ignoreDuplicates: true`.

---

## 📱 Responsive Breakpoints

| Breakpoint | Layout Changes |
|-----------|----------------|
| `> 1100px` | Full 4-column summary cards |
| `900px` | Hamburger sidebar, single-column log/analytics |
| `600px` | 2-column summary cards, stacked filters |
| `400px` | Single-column summary cards |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **ISC License** — see [`package.json`](package.json) for details.

---

## 👤 Author

**Atharva Vaidya**  
Built with ❤️ for musicians everywhere.

---

## 🙏 Acknowledgements

- [Supabase](https://supabase.com) — open source Firebase alternative
- [Vercel](https://vercel.com) — deployment platform
- [Inter Font](https://fonts.google.com/specimen/Inter) — Google Fonts
- [Supabase JS v2](https://github.com/supabase/supabase-js) — client library

---

*Made for musicians who want to practice smarter, not just harder. 🎶*
