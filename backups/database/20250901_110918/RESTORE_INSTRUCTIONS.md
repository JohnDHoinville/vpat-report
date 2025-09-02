# Database Restore Instructions

## Created: $(date)
## Database: accessibility_testing
## Location: $(pwd)/$BACKUP_DIR

## Available Backup Files:

1. **accessibility_testing_FULL_BACKUP.dump** - Complete database (RECOMMENDED)
   - Custom format with full schema and data
   - Use: `pg_restore -h localhost -U postgres -d NEW_DB_NAME accessibility_testing_FULL_BACKUP.dump`

2. **accessibility_testing_PLAIN_SQL.sql** - Human-readable SQL dump
   - Complete schema and data in SQL format
   - Use: `psql -h localhost -U postgres -d NEW_DB_NAME < accessibility_testing_PLAIN_SQL.sql`

3. **accessibility_testing_SCHEMA_ONLY.sql** - Schema structure only
   - Tables, indexes, constraints, functions
   - Use: `psql -h localhost -U postgres -d NEW_DB_NAME < accessibility_testing_SCHEMA_ONLY.sql`

4. **accessibility_testing_DATA_ONLY.dump** - Data only (requires existing schema)
   - Use after restoring schema: `pg_restore -h localhost -U postgres -d NEW_DB_NAME accessibility_testing_DATA_ONLY.dump`

## Quick Restore Commands:

### Full Database Restore (creates new database):
```bash
# Create new database
createdb -h localhost -U postgres NEW_DATABASE_NAME

# Restore full backup
pg_restore -h localhost -U postgres -d NEW_DATABASE_NAME accessibility_testing_FULL_BACKUP.dump
```

### Alternative SQL Restore:
```bash
# Create new database
createdb -h localhost -U postgres NEW_DATABASE_NAME

# Restore using SQL dump
psql -h localhost -U postgres -d NEW_DATABASE_NAME < accessibility_testing_PLAIN_SQL.sql
```

## Verification:
After restore, verify with:
```bash
psql -d NEW_DATABASE_NAME -c "\dt+"
psql -d NEW_DATABASE_NAME -c "SELECT count(*) FROM test_sessions;"
psql -d NEW_DATABASE_NAME -c "SELECT count(*) FROM unified_requirements;"
```
