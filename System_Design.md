## System Design: Backup and Restore

### Database

- PostgreSQL database name: `accessibility_testing`
- Default connection user: `johnhoinville`
- Connection defined via environment in `database/config.js` and `.env`.

### Backups

- Location: `database/backups/`
- Naming: `backup-YYYY-MM-DDTHH-MM-SS-SSSZ-<shortid>.sql.gz`
- Create backup:
  ```bash
  pg_dump -h localhost -U johnhoinville -d "$DB_NAME" --verbose | gzip \
    > database/backups/backup-$(date +%Y-%m-%dT%H-%M-%S-%3NZ)-$(openssl rand -hex 4).sql.gz
  ```

### Restore

- Non-destructive approach: restore into a new DB and point the backend using `DB_NAME`.
- In-place approach: take pre-restore snapshot, reset `public` schema, restore.

Example in-place steps:
```bash
# 1) Pre-restore snapshot
pg_dump -h localhost -U johnhoinville -d accessibility_testing --verbose | gzip \
  > database/backups/backup-pre-restore-$(date +%Y%m%d-%H%M%S).sql.gz

# 2) Reset schema
psql -h localhost -U johnhoinville -d accessibility_testing -v ON_ERROR_STOP=1 -c \
  "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; \
   GRANT ALL ON SCHEMA public TO johnhoinville; GRANT USAGE ON SCHEMA public TO public;"

# 3) Restore backup (remap owners if needed)
gunzip -c database/backups/<file>.sql.gz \
  | sed 's/OWNER TO postgres/OWNER TO johnhoinville/g' \
  | psql -h localhost -U johnhoinville -d accessibility_testing --set ON_ERROR_STOP=1 --echo-errors
```

### Backend Visibility

- When starting backend on port 3001, run with env for verbose logs:
```bash
STRICT_AUTOMATION=true PLAYWRIGHT_HEADLESS=true NODE_ENV=development \
DB_HOST=localhost DB_PORT=5432 DB_NAME=accessibility_testing \
node api/server.js | cat
```

### UI Layout Notes

- Requirement Details modal uses Tailwind grids.
- Layout updated to single-column by removing responsive two-column classes in:
  - `components/components/session-details-modal.html`
  - `components/session-details-modal.html`
  - `dashboard/components/session-details-modal.html`



