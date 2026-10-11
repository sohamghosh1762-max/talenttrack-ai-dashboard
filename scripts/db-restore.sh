#!/usr/bin/env bash
# ==============================================================================
# TalentTrack AI — Automated MongoDB Restore Script
# Restores database from a compressed archive into a target database
# ==============================================================================

set -euo pipefail

ARCHIVE_PATH="${1:-}"

if [ -z "${ARCHIVE_PATH}" ]; then
  echo "❌ Error: Please specify the path to the backup archive."
  echo "   Usage: bash scripts/db-restore.sh <path-to-archive.gz>"
  echo "   Example: TARGET_DB=talenttrack_restore_test bash scripts/db-restore.sh ./backups/talenttrack_backup_latest.gz"
  exit 1
fi

if [ ! -f "${ARCHIVE_PATH}" ]; then
  echo "❌ Error: Specified archive file '${ARCHIVE_PATH}' does not exist."
  exit 1
fi

TARGET_DB="${TARGET_DB:-talenttrack}"
MONGODB_URI="${MONGODB_URI:-mongodb://127.0.0.1:27017}"
MASKED_URI=$(echo "${MONGODB_URI}" | sed -E 's/(mongodb(\+srv)?:\/\/[^:]+:)[^@]+@/\1*****@/')

echo "=================================================================="
echo "  TalentTrack AI — Database Restore Process"
echo "  Target Host: ${MASKED_URI}"
echo "  Target DB:   ${TARGET_DB}"
echo "  Archive:     ${ARCHIVE_PATH}"
echo "=================================================================="

if command -v mongorestore &> /dev/null; then
  echo "[Restore] Restoring archive into '${TARGET_DB}' with --drop..."
  if mongorestore --uri="${MONGODB_URI}" --nsInclude="${TARGET_DB}.*" --archive="${ARCHIVE_PATH}" --gzip --drop; then
    echo "[Restore] Restore completed successfully into '${TARGET_DB}'."
  else
    echo "❌ Error: mongorestore execution failed." >&2
    exit 1
  fi
elif [ "${ALLOW_SIMULATION:-0}" = "1" ]; then
  echo "[Restore] NOTICE: 'mongorestore' not found in PATH."
  echo "          Running in explicit simulation mode (ALLOW_SIMULATION=1)."
  echo "          Verified archive exists: ${ARCHIVE_PATH} ($(du -h "${ARCHIVE_PATH}" | cut -f1))"
else
  echo "❌ Error: 'mongorestore' command not found in PATH." >&2
  echo "   Prerequisites: Please install MongoDB Database Tools to run automated restoration." >&2
  echo "   - macOS:  brew tap mongodb/brew && brew install mongodb-database-tools" >&2
  echo "   - Ubuntu: sudo apt-get install -y mongodb-database-tools" >&2
  echo "   - Atlas:  Use Atlas Backup Restoration UI or Node.js restore utility (scripts/backup-restore-util.ts)." >&2
  echo "   - CI/CD:  Set ALLOW_SIMULATION=1 if executing a mock dry-run." >&2
  exit 1
fi

echo "=================================================================="
echo "  TalentTrack AI — Restore Verification Completed"
echo "=================================================================="
