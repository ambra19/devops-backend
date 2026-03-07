#!/usr/bin/env bash
# =============================================================================
# backup-data.sh — Export all DynamoDB table items to JSON files before
# running terraform destroy.
#
# Usage:
#   ./bin/backup-data.sh              # backs up to ./backups/<timestamp>/
#   ./bin/backup-data.sh --dir ./my-backup
#
# Each table is exported as a separate JSON file that restore-data.sh
# can read back in after a fresh terraform apply.
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AWS_PROFILE="terraform"
AWS_REGION="eu-central-1"

BACKUP_DIR="${REPO_ROOT}/backups/$(date +%Y%m%d_%H%M%S)"
if [[ "${1:-}" == "--dir" && -n "${2:-}" ]]; then
  BACKUP_DIR="$2"
fi

mkdir -p "${BACKUP_DIR}"
info "Backing up to: ${BACKUP_DIR}"

# Tables to back up — only the ones that have meaningful data
# Attendance and Enrollments are empty so skipped, add them if needed
TABLES=("Users" "Courses" "Departments" "Enrollments" "Attendance")

for table in "${TABLES[@]}"; do
  info "  Scanning ${table}..."

  aws dynamodb scan \
    --table-name "${table}" \
    --profile "${AWS_PROFILE}" \
    --region "${AWS_REGION}" \
    --output json > "${BACKUP_DIR}/${table}.json"

  count=$(python3 -c "import json,sys; d=json.load(open('${BACKUP_DIR}/${table}.json')); print(d['Count'])")
  success "  ${table}: ${count} items saved"
done

echo ""
success "Backup complete: ${BACKUP_DIR}"
echo ""
info "To restore after apply: ./bin/restore-data.sh --dir ${BACKUP_DIR}"