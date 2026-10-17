# TalentTrack AI — Database Backup, Disaster Recovery & High Availability Runbook

## 1. Overview & Architecture

TalentTrack AI uses MongoDB (via Mongoose) as its primary persistent document store. The database stores critical recruitment data, including user accounts, job postings, candidate applications, scheduled interviews, notifications, resume metadata, and AI screening assessments.

### Key Metrics
- **Recovery Point Objective (RPO):** Maximum 1 hour (daily automated snapshots + hourly write-ahead journal/oplog backup in production).
- **Recovery Time Objective (RTO):** Maximum 15 minutes to complete restoration and resume traffic.
- **Data Classification:** Confidential (Candidate PII, resumes, and evaluation notes). All backups must be encrypted at rest and in transit.

---

## 2. Deployment Topology & Strategies

TalentTrack AI supports two primary deployment topologies:

### A. Managed MongoDB Atlas (Recommended for Production)
When deployed on MongoDB Atlas (via `mongodb+srv://...`):
- **Automated Continuous Cloud Backups:** Atlas Continuous Cloud Backups are enabled, capturing changes via the replica set oplog.
- **Point-in-Time Recovery (PITR):** Enables rolling back the database to any specified second within the last 7 days.
- **Snapshot Retention Schedule:**
  - Hourly snapshots: Retained for 24 hours.
  - Daily snapshots: Retained for 30 days.
  - Weekly snapshots: Retained for 12 weeks.
  - Monthly snapshots: Retained for 12 months.
- **Cross-Region Snapshots:** Replicated to a secondary cloud region to protect against regional availability zone outages.

### B. Self-Managed MongoDB Server (Local / On-Prem / VM Deployments)
For self-hosted instances, automated backups are executed using the provided automated backup tool (`scripts/db-backup.sh`) using `mongodump` with gzip compression and AES-256 encryption.

---

## 3. Automated Backup Procedure (`mongodump`)

The `scripts/db-backup.sh` script automates consistent backups without exposing credentials in process lists (`ps`) or shell history (`.bash_history`).

### Command Usage
```bash
# Run automated backup (uses MONGODB_URI from environment)
bash scripts/db-backup.sh

# Or specify custom target output directory
BACKUP_DIR=/var/backups/talenttrack bash scripts/db-backup.sh
```

### Backup Script Guarantees:
1. **Masked Credentials:** Sanitizes connection strings in console and log output.
2. **Consistent Snapshot:** Uses `--forceTableScan` or oplog replication where supported to produce a consistent point-in-time snapshot.
3. **Compression:** Compresses archive with gzip (`--gzip`), reducing storage by up to 85%.
4. **Encryption (Optional):** Supports automatic GPG symmetric encryption (`gpg --symmetric --cipher-algo AES256`) when `BACKUP_ENCRYPTION_KEY` is provided.
5. **Retention Enforcement:** Automatically prunes local backup files older than `RETENTION_DAYS` (default: 14 days).

---

## 4. Restoration & Disaster Recovery Runbook (`mongorestore`)

### Prerequisites Before Restoration
1. Verify MongoDB server connectivity and sufficient disk space.
2. Ensure no active write traffic is reaching the destination database during restoration.
3. Confirm backup archive integrity (test decompression with `gzip -t` or `tar -tzf`).

### Step-by-Step Restoration Command
```bash
# Execute restoration using the automated script
bash scripts/db-restore.sh /path/to/talenttrack-backup-YYYY-MM-DD.gz
```

### Safe Restoration Verification Plan (Isolated Staging Environment)
Before restoring into a production database, operators must validate the backup in an isolated validation database:

```bash
# 1. Restore archive into temporary verification database
TARGET_DB=talenttrack_restore_test bash scripts/db-restore.sh /path/to/talenttrack-backup-YYYY-MM-DD.gz

# 2. Run post-restoration health check
node -e '
const mongoose = require("mongoose");
async function verify() {
  await mongoose.connect("mongodb://127.0.0.1:27017/talenttrack_restore_test");
  const users = await mongoose.connection.collection("users").countDocuments();
  const jobs = await mongoose.connection.collection("jobs").countDocuments();
  const applications = await mongoose.connection.collection("applications").countDocuments();
  console.log(`Verification: ${users} users, ${jobs} jobs, ${applications} applications restored.`);
  await mongoose.disconnect();
}
verify();
'

# 3. Clean up test database once verified
mongosh talenttrack_restore_test --eval "db.dropDatabase()"
```

---

## 5. Programmatic Node.js Backup & Restore Engine (`scripts/backup-restore-util.ts`)

In environments where native CLI binaries (`mongodump` / `mongorestore`) are not installed or where cross-platform Node.js execution is preferred, TalentTrack AI includes a built-in programmatic backup and restore utility:

```bash
# Generate a compressed gzip backup with sha256 checksum
npx tsx scripts/backup-restore-util.ts backup --out ./backups/snapshot.json.gz

# Restore a snapshot to an isolated target database
npx tsx scripts/backup-restore-util.ts restore --file ./backups/snapshot.json.gz --uri mongodb://127.0.0.1:27017/talenttrack_test

# Verify integrity and document counts of an existing archive
npx tsx scripts/backup-restore-util.ts verify --file ./backups/snapshot.json.gz
```

### Features:
- **Zero Binary Dependency:** Works using standard Mongoose/MongoDB Node.js driver connections.
- **Data Integrity:** Calculates and verifies SHA-256 checksums on all generated archives.
- **Safe Dry-Run:** Built-in verification mode inspects document counts and structure prior to restoring.

---

## 6. MongoDB Atlas Network Access Configuration

When deploying against MongoDB Atlas, connectivity requires appropriate network access permissions:
1. **Atlas IP Access List:** If your application server IP changes or is dynamic, ensure the public IP address is added to the Atlas Network Access list via:
   - Atlas Console -> Security -> Network Access -> Add IP Address (`<server-ip>/32` or `0.0.0.0/0` for universal cloud egress).
2. **DNS & SRV Resolution:** Ensure egress port 27017 is accessible and DNS resolvers can resolve `_mongodb._tcp.*` SRV records.
3. **Connection Failure Diagnostics:** When connection fails due to IP restrictions, TalentTrack AI safely logs:
   `[MongoDB] Connection error: Could not connect to any servers in your MongoDB Atlas cluster... verify that your current IP address is on your Atlas cluster's IP whitelist.` without exposing credentials.

---

## 7. Post-Restoration Validation Checklist

Operators must confirm the following criteria before routing traffic back to the restored database:

- [ ] **Document Count Verification:** All collections (`users`, `jobs`, `applications`, `interviews`, `resumes`, `notifications`, `background_jobs`, `sessions`, `authtokens`) contain the expected document counts.
- [ ] **Index Rebuild Verification:** Check that all unique constraints and compound indexes are active:
  - `users`: `{ email: 1 }` (unique)
  - `jobs`: `{ status: 1, createdAt: -1 }`, `{ status: 1, department: 1 }`, `{ recruiterId: 1, status: 1 }`
  - `applications`: `{ jobId: 1, applicantId: 1 }` (unique), `{ applicantId: 1, appliedAt: -1 }`, `{ jobId: 1, currentStage: 1 }`
  - `interviews`: `{ applicationId: 1, scheduledAt: 1 }`, `{ recruiterId: 1, scheduledAt: 1 }`
  - `resumes`: `{ s3Key: 1 }` (unique)
  - `sessions`: `{ tokenHash: 1 }` (unique), TTL index `{ expiresAt: 1 }`
  - `authtokens`: `{ tokenHash: 1 }` (unique), TTL index `{ expiresAt: 1 }`
  - `background_jobs`: `{ jobId: 1 }` (unique), `{ status: 1, nextRunAt: 1 }`
- [ ] **API Readiness Check:**
  ```bash
  curl -i http://localhost:3000/api/ready
  # Expected HTTP 200 OK: {"success":true,"data":{"ready":true,"database":"connected"}}
  ```
- [ ] **Background Worker Restart:** Confirm stale locks are cleared and workers resume processing:
  ```bash
  curl -i http://localhost:3000/api/health
  ```
- [ ] **Security Audit:** Confirm sensitive fields (tokens, credentials, resumes) remain encrypted and restricted according to role access policies.
