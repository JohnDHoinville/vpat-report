## Database Restore - 2025-08-22

This note documents restoring the local PostgreSQL database from the backup `backup-2025-08-19T13-04-36-842Z-7d65a0ab.sql.gz` and creating a pre-restore snapshot.

- Pre-restore backup created: `database/backups/backup-pre-restore-20250821-222020.sql.gz`
- Restored backup source: `database/backups/backup-2025-08-19T13-04-36-842Z-7d65a0ab.sql.gz`
- Target database: `accessibility_testing`
- DB owner user: `johnhoinville`

### Steps

1. Create pre-restore backup
   ```bash
   pg_dump -h localhost -U johnhoinville -d accessibility_testing --verbose | gzip \
     > database/backups/backup-pre-restore-$(date +%Y%m%d-%H%M%S).sql.gz
   ```

2. Reset schema to avoid object conflicts
   ```bash
   psql -h localhost -U johnhoinville -d accessibility_testing -v ON_ERROR_STOP=1 -c \
     "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; \
      GRANT ALL ON SCHEMA public TO johnhoinville; GRANT USAGE ON SCHEMA public TO public;"
   ```

3. Restore backup while remapping object owners from `postgres` to `johnhoinville`
   ```bash
   gunzip -c database/backups/backup-2025-08-19T13-04-36-842Z-7d65a0ab.sql.gz \
     | sed 's/OWNER TO postgres/OWNER TO johnhoinville/g' \
     | psql -h localhost -U johnhoinville -d accessibility_testing --set ON_ERROR_STOP=1 --echo-errors
   ```

### Verification

- Tables present:
  ```bash
  psql -h localhost -U johnhoinville -d accessibility_testing -c "\\dt"
  ```

- Sample row counts:
  ```bash
  psql -h localhost -U johnhoinville -d accessibility_testing -At -c \
    "SELECT 'projects', count(*) FROM projects UNION ALL \
      SELECT 'discovered_pages', count(*) FROM discovered_pages UNION ALL \
      SELECT 'users', count(*) FROM users UNION ALL \
      SELECT 'violations', count(*) FROM violations;"
  ```

At time of restore:

- `projects`: 5
- `discovered_pages`: 137
- `users`: 8
- `violations`: 20

### Notes

- Error encountered for missing role `postgres` during initial attempt; resolved by rewriting `OWNER TO postgres` to `OWNER TO johnhoinville` during restore.
- All commands were executed locally on macOS with PostgreSQL accessible on `localhost`.


