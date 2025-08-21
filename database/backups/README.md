# Database Backups

This directory stores project PostgreSQL backups that should be versioned for disaster recovery in development.

## File naming
- backup-YYYY-MM-DDTHH-MM-SS-SSSZ-<shortid>.sql.gz
- backup-pre-restore-YYYYMMDD-HHMMSS.sql.gz

## Create a backup
```bash
pg_dump -U johnhoinville -d $DB_NAME | gzip > database/backups/backup-$(date +%Y-%m-%dT%H-%M-%S-%3NZ)-$(openssl rand -hex 4).sql.gz
```

## Restore a backup into a new database
```bash
createdb -U johnhoinville accessibility_testing_restore
gunzip -c database/backups/<file>.sql.gz | psql -U johnhoinville -d accessibility_testing_restore
```

## Point backend to a restored DB
Set in environment before starting the server:
```bash
export DB_NAME=accessibility_testing_restore
STRICT_AUTOMATION=true PLAYWRIGHT_HEADLESS=true NODE_ENV=development node api/server.js | cat
```

## Notes
- Backups contain dev data. Do not include production credentials.
- Keep only recent snapshots to limit repo size if needed.
