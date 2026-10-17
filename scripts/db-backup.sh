#!/usr/bin/env bash
# ==============================================================================
# TalentTrack AI — Automated MongoDB Backup Script
# Creates a compressed, point-in-time snapshot with credential masking
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_ARCHIVE="${BACKUP_DIR}/talenttrack_backup_${TIMESTAMP}.gz"

# Fallback URI if not set in environment
MONGODB_URI="${MONGODB_URI:-mongodb://127.0.0.1:27017/talenttrack}"

# Mask connection string credentials for log security
MASKED_URI=$(echo "${MONGODB_URI}" | sed -E 's/(mongodb(\+srv)?:\/\/[^:]+:)[^@]+@/\1*****@/')

mkdir -p "${BACKUP_DIR}"

echo "=================================================================="
echo "  TalentTrack AI — Database Backup Process Initiated"
echo "  Target: ${MASKED_URI}"
echo "  Timestamp: ${TIMESTAMP}"
echo "=================================================================="

# Check for mongodump availability
if command -v mongodump &> /dev/null; then
  echo "[Backup] Executing mongodump..."
  if mongodump --uri="${MONGODB_URI}" --archive="${OUTPUT_ARCHIVE}" --gzip; then
    # Verify backup archive exists and passes gzip integrity check
    if [ -f "${OUTPUT_ARCHIVE}" ] && [ -s "${OUTPUT_ARCHIVE}" ]; then
      if command -v gzip &> /dev/null && gzip -t "${OUTPUT_ARCHIVE}" 2>/dev/null; then
        echo "[Backup] Successfully created and verified compressed backup archive:"
        echo "         -> ${OUTPUT_ARCHIVE}"
        echo "         -> Size: $(du -h "${OUTPUT_ARCHIVE}" | cut -f1)"
        echo "         -> Integrity: GZIP checksum verified"
      else
        echo "[Backup] Archive created at ${OUTPUT_ARCHIVE} ($(du -h "${OUTPUT_ARCHIVE}" | cut -f1))."
      fi
    else
      echo "❌ Error: mongodump finished but output archive '${OUTPUT_ARCHIVE}' is missing or empty." >&2
      exit 1
    fi
  else
    echo "❌ Error: mongodump command failed during backup execution." >&2
    exit 1
  fi
elif [ "${ALLOW_SIMULATION:-0}" = "1" ]; then
  echo "[Backup] NOTICE: 'mongodump' command not found in PATH."
  echo "         Running in explicit simulation mode (ALLOW_SIMULATION=1)."
  echo "{\"timestamp\":\"${TIMESTAMP}\",\"target\":\"${MASKED_URI}\",\"status\":\"simulated\"}" > "${OUTPUT_ARCHIVE}.meta"
  echo "[Backup] Generated simulation descriptor at ${OUTPUT_ARCHIVE}.meta"
else
  echo "❌ Error: 'mongodump' command not found in PATH." >&2
  echo "   Prerequisites: Please install MongoDB Database Tools to run automated shell backups." >&2
  echo "   - macOS:  brew tap mongodb/brew && brew install mongodb-database-tools" >&2
  echo "   - Ubuntu: sudo apt-get install -y mongodb-database-tools" >&2
  echo "   - Atlas:  Use Atlas Automated Cloud Backups or the Node.js backup utility (scripts/backup-restore-util.ts)." >&2
  echo "   - CI/CD:  Set ALLOW_SIMULATION=1 if executing a mock dry-run." >&2
  exit 1
fi

# Apply retention policy: Remove archives older than RETENTION_DAYS
if [ -d "${BACKUP_DIR}" ]; then
  find "${BACKUP_DIR}" -name "talenttrack_backup_*.gz*" -type f -mtime "+${RETENTION_DAYS}" -exec rm -f {} + 2>/dev/null || true
  echo "[Backup] Retention policy applied (pruned backups older than ${RETENTION_DAYS} days)."
fi

echo "=================================================================="
echo "  TalentTrack AI — Backup Process Completed Successfully"
echo "=================================================================="
