## Deploying the Accessibility Testing App to Heroku

This guide describes a simple, reliable Heroku setup so your team can access the app on the web.

### Recommended: Single Heroku app (API + static UI)
- One URL for your staff
- No CORS complications
- WebSockets supported by default

#### 1) Create app and add buildpacks
```bash
heroku create vpat-prod --stack=heroku-22
heroku buildpacks:add heroku/nodejs -a vpat-prod
heroku buildpacks:add https://github.com/mxschmitt/heroku-playwright-buildpack -a vpat-prod
```

#### 2) Add Postgres and set config
```bash
heroku addons:create heroku-postgresql:mini -a vpat-prod
heroku config:set NODE_ENV=production JWT_SECRET='<strong-secret>' -a vpat-prod
# Allow the app origin (add more space-delimited origins as needed)
heroku config:set CORS_ORIGINS="https://vpat-prod.herokuapp.com" -a vpat-prod
# Optional automation flags
heroku config:set STRICT_AUTOMATION=true PLAYWRIGHT_HEADLESS=true -a vpat-prod
```

#### 3) Map DATABASE_URL to the app’s DB_* variables
This code reads `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.

```bash
# Show the full URL and copy parts
heroku pg:credentials:url -a vpat-prod

# Example mapping (replace with your values)
heroku config:set \
  DB_HOST='<host>' \
  DB_PORT='5432' \
  DB_NAME='<db>' \
  DB_USER='<user>' \
  DB_PASSWORD='<password>' \
  -a vpat-prod
```

#### 4) Deploy and tail logs
```bash
# Push current branch to Heroku main
git push https://git.heroku.com/vpat-prod.git HEAD:main

# Tail logs
heroku logs -t -a vpat-prod
```

#### 5) (Optional) Import your local backup
If you have a local DB (e.g., `accessibility_testing_0819`) you want online:
```bash
heroku pg:push accessibility_testing_0819 DATABASE_URL -a vpat-prod
```

### Alternative: Two apps (API and static separately)
- API: deploy as above (Node + Playwright, Postgres)
- UI: serve static files via Heroku static buildpack or Netlify
- Configure the UI’s API base URL to the API app and include it in `CORS_ORIGINS`

### Notes and tips
- WebSockets: supported on Heroku by default; the client auto-reconnects.
- Disk is ephemeral: use Heroku Postgres backups instead of relying on local files. See `database/backups/README.md` for local workflow.
- Logs: use `heroku logs -t -a <app>` for live visibility.
- Robots: the crawler currently bypasses robots.txt when `respect_robots_txt=false`.

### (Optional) Serve static UI from the same Node app
If you prefer one app but don’t want an extra static host, add an Express static handler to serve `index.html`, `js/`, and `components/` from this repository. This avoids any CORS setup entirely.

### Quick checklist
- App created with Node + Playwright buildpacks
- Postgres provisioned
- `DB_*` env vars set from `DATABASE_URL`
- `JWT_SECRET`, `CORS_ORIGINS`, and optional flags configured
- Code pushed and logs healthy
- (Optional) Backup imported



