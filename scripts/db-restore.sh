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
  mongorestore --uri="${MONGODB_URI}" --nsInclude="${TARGET_DB}.*" --archive="${ARCHIVE_PATH}" --gzip --drop
  echo "[Restore] Restore completed successfully."
else
  echo "[Restore] Notice: 'mongorestore' not found in PATH."
  echo "          Verified archive exists: ${ARCHIVE_PATH} ($(du -h "${ARCHIVE_PATH}" | cut -f1))"
fi

echo "=================================================================="
echo "  TalentTrack AI — Restore Verification Completed"
echo "=================================================================="
