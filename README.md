# Oojas Action Tracker

A single-page, self-contained Action Tracker, deployed as a static site on Vercel
behind a proper sign-in page.

## What's in here

| File | What it does |
| --- | --- |
| `index.html` | The tracker itself. Fully self-contained (all CSS/JS inline). |
| `login.html` | The sign-in page, styled to match the tracker. |
| `middleware.js` | Runs at Vercel's edge on every request. No valid session cookie → serves the login page instead. |
| `lib/auth.js` | Credentials, session settings, and shared helpers. **This is the file to edit to change the password.** |
| `api/login.js` | Checks the submitted email + password, sets the session cookie. |
| `api/state.js` | Reads/writes the shared tracker state. Works with Supabase or Redis. |
| `supabase-setup.sql` | One-time table setup, if you go the Supabase route. |
| `api/logout.js` | Clears the session cookie and returns to the login page. |
| `package.json` | Declares `@vercel/functions` and `"type": "module"`. |
| `vercel.json` | Security + `noindex` + cache headers. |
| `robots.txt` | Tells search engines to stay away. |

## Login

| | |
| --- | --- |
| Email | `oojaas.sehgal@headsupfortails.com` |
| Password | `Huft@2026` |

Signing in sets an `HttpOnly; Secure; SameSite=Lax` cookie that lasts **30 days**
on that device. The email is matched case-insensitively; the password is exact.

To sign out, visit `/api/logout`.

## How the protection works

The session cookie is not the password — it's a SHA-256 value derived from the
credentials. The browser never receives the password back, and because the cookie
is derived, **changing the password automatically signs everyone out**.

The middleware runs before any file is served, so `index.html` is never sent to a
browser that isn't signed in. Only `/login.html`, `/api/login`, `/api/logout` and
`robots.txt` are reachable while signed out.

## Where the shared data lives

The tracker's state (checkboxes, due dates, edits, ordering, custom sections) is
stored server-side so everyone who signs in sees the same list. There is no
separate server to run.

`api/state.js` supports **either Supabase or Redis** and picks whichever one it
finds environment variables for. Set up one of them.

### Option A — Supabase (recommended if you already use it)

1. In your Supabase project: **SQL Editor** → **New query** → paste the contents
   of `supabase-setup.sql` → **Run**. That creates one `tracker_state` table with
   RLS on.
2. **Settings** → **API Keys**: copy the project URL and a **secret key**
   (`sb_secret_…`). The older `service_role` key also works but is deprecated —
   Supabase is retiring legacy keys by the end of 2026.
3. Vercel → your project → **Settings** → **Environment Variables**, add:

   | Name | Value |
   | --- | --- |
   | `SUPABASE_URL` | `https://xxxx.supabase.co` |
   | `SUPABASE_SECRET_KEY` | `sb_secret_…` |

4. **Deployments** → latest → ⋯ → **Redeploy**.

The secret key is server-only — it never reaches the browser, and it's the only
thing that can read the table, since RLS is enabled with no policies.

### Option B — Redis

Vercel dashboard → your project → **Storage** → **Create Database** → pick a
Redis store from the Marketplace (Upstash's free tier is far more than this
needs) → connect it to the project → redeploy. Vercel injects the credentials
itself; `api/state.js` reads `KV_REST_API_URL` / `KV_REST_API_TOKEN` or
`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.

**Until you do that**, the tracker still works: it falls back to `localStorage`
and the badge next to the progress bar reads **"This device only"** instead of
**"Synced"**. When you connect the store, whatever is already saved on that
device gets carried up into the shared store on the next load.

The `/api/state` endpoint requires the session cookie, so the data is only
readable by someone who has signed in.

### How syncing behaves

Changes are written about 0.7s after you stop editing, and each device re-checks
the server every 25 seconds (and whenever you switch back to the tab). It's
last-write-wins: if two people edit the exact same field within a few seconds of
each other, the later save is the one that sticks.

## Due dates

Every item has a 🗓 control. Setting a date and time does two things:

- The **Today / This Week / Later** tag is derived from it — due today or earlier
  → Today, within 7 days → This week, beyond that → Later. While a due date is
  set, the tag can't be changed by hand; clear the date to go back to manual
  tagging.
- Overdue items turn red with a ⚠ marker.

The **Due by** row at the top filters the list to items due on or before a chosen
date, with **Today** and **Next 7 days** shortcuts.

## Deploying

Already connected to Vercel — every push to `main` redeploys automatically:

```bash
git add .
git commit -m "Add sign-in page"
git push
```

For a first-time setup, import the repo at <https://vercel.com/new> and leave every
setting at its default (Framework Preset `Other`, no build command, no output
directory).

### Custom domain (optional)

Project → **Settings** → **Domains** → add e.g. `tracker.headsupfortails.com`,
then add the CNAME record Vercel shows you at your DNS provider.

## Changing the password

Edit the two constants at the top of `lib/auth.js` and push, **or** (better) set
them as environment variables so they never appear in the repo:

Vercel → Project → **Settings** → **Environment Variables** → add:

| Name | Value |
| --- | --- |
| `SITE_USERNAME` | the login email |
| `SITE_PASSWORD` | the password |

Then **Deployments** → latest → ⋯ → **Redeploy**. Env vars override the hardcoded
values. Either way, everyone gets signed out and has to log in again.

## ⚠️ Note on the hardcoded password

`sidharthlahotihuft/oojasactiontracker` is a **public** GitHub repo, so anyone who
finds it can read `lib/auth.js` and see the password. Do one of:

- Make the repo private (GitHub → Settings → Danger Zone → Change visibility), **or**
- Move the credentials to environment variables as described above and delete them
  from `lib/auth.js`.

Vercel deploys private repos on the free Hobby plan without any extra setup.

## Note on the URL

Vercel's certificate covers `actiontrackerhuft.vercel.app`, not
`www.actiontrackerhuft.vercel.app`. Always use the URL **without** `www.` — the
`www.` version will show a certificate warning in the browser.

## Updating the tracker content

The tracker is just `index.html`. Edit it, commit, push — Vercel redeploys.
