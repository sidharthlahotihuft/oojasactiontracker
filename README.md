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
