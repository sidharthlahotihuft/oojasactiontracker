# Oojas Action Tracker

A single-page, self-contained Action Tracker, deployed as a static site on Vercel
and protected by a username + password.

## What's in here

| File | What it does |
| --- | --- |
| `index.html` | The tracker itself. Fully self-contained (all CSS/JS inline). |
| `middleware.js` | Runs on every request at Vercel's edge. Asks for a username + password before serving anything. |
| `package.json` | Declares `@vercel/functions` (needed by the middleware) and `"type": "module"`. |
| `vercel.json` | Security + `noindex` headers. |
| `robots.txt` | Tells search engines to stay away. |

## Login

| | |
| --- | --- |
| Username | `oojaas.sehgal@headsupfortails.com` |
| Password | `Huft@2026` |

The browser shows a native sign-in dialog on first visit and remembers the
credentials for the rest of the browser session.

## Deploying (one time, ~3 minutes)

1. Push these files to the repo:

   ```bash
   git init
   git add .
   git commit -m "Action tracker + password protection"
   git branch -M main
   git remote add origin https://github.com/sidharthlahotihuft/oojasactiontracker.git
   git push -u origin main
   ```

2. Go to <https://vercel.com/new>, sign in with GitHub, and import
   `sidharthlahotihuft/oojasactiontracker`.

3. Leave every setting at its default:
   - **Framework Preset:** `Other`
   - **Build Command:** empty
   - **Output Directory:** empty
   - **Install Command:** default (`npm install`)

4. Click **Deploy**. After ~30 seconds you get a live URL like
   `https://oojasactiontracker.vercel.app`, which will prompt for the login above.

Every later `git push` to `main` redeploys automatically.

### Custom domain (optional)

Project → **Settings** → **Domains** → add e.g. `tracker.headsupfortails.com`,
then add the CNAME record Vercel shows you at your DNS provider.

## Changing the password

Either edit the two constants at the top of `middleware.js` and push, **or**
(better) set them as environment variables so they never appear in the repo:

Vercel → Project → **Settings** → **Environment Variables** → add:

| Name | Value |
| --- | --- |
| `SITE_USERNAME` | the login email |
| `SITE_PASSWORD` | the password |

Then **Deployments** → latest → ⋯ → **Redeploy**. Env vars override the
hardcoded values.

## ⚠️ Note on the hardcoded password

`sidharthlahotihuft/oojasactiontracker` is currently a **public** GitHub repo, so
anyone who finds it can read `middleware.js` and see the password. Do one of:

- Make the repo private (GitHub → Settings → Danger Zone → Change visibility), **or**
- Move the credentials to environment variables as described above and remove
  them from `middleware.js`.

Vercel deploys private repos on the free Hobby plan without any extra setup.

## Updating the tracker content

The tracker is just `index.html`. Edit it, commit, push — Vercel redeploys.
