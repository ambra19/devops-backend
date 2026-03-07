#!/usr/bin/env bash
# =============================================================================
# restore-data.sh — Restore DynamoDB items from a backup created by
# backup-data.sh after a fresh terraform apply.
#
# Usage:
#   ./bin/restore-data.sh --dir ./backups/20260307_120000
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

AWS_PROFILE="terraform"
AWS_REGION="eu-central-1"

BACKUP_DIR=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir) BACKUP_DIR="$2"; shift 2 ;;
    *) error "Unknown argument: $1" ;;
  esac
done

[[ -z "${BACKUP_DIR}" ]] && error "Usage: ./bin/restore-data.sh --dir <backup_dir>"
[[ -d "${BACKUP_DIR}" ]] || error "Backup directory not found: ${BACKUP_DIR}"

info "Restoring from: ${BACKUP_DIR}"

# boto3 is required for DynamoDB type deserialisation
if ! python3 -c "import boto3" 2>/dev/null; then
  info "boto3 not found — installing..."
  pip3 install boto3 --quiet || error "Failed to install boto3. Run: pip3 install boto3"
fi
for file in "${BACKUP_DIR}"/*.json; do
  table=$(basename "${file}" .json)
  info "  Restoring ${table}..."

  # Extract items array and write each as a batch-write request
  count=$(python3 -c "import json,sys; d=json.load(open('${file}')); print(d['Count'])")

  if [[ "${count}" -eq 0 ]]; then
    warn "  ${table}: 0 items, skipping"
    continue
  fi

  # DynamoDB batch-write accepts max 25 items per request — split accordingly
  python3 - "${file}" "${table}" <<'PYEOF'
import json, sys, boto3

backup_file = sys.argv[1]
table_name  = sys.argv[2]

with open(backup_file) as f:
    items = json.load(f)["Items"]

client = boto3.resource("dynamodb", region_name="eu-central-1")
table  = client.Table(table_name)

# Batch write in chunks of 25
chunk_size = 25
for i in range(0, len(items), chunk_size):
    chunk = items[i:i + chunk_size]
    with table.batch_writer() as batch:
        for item in chunk:
            # DynamoDB scan returns DynamoDB JSON — deserialize it first
            deserialized = boto3.dynamodb.types.TypeDeserializer()
            plain = {k: deserialized.deserialize(v) for k, v in item.items()}
            batch.put_item(Item=plain)

print(f"  Restored {len(items)} items into {table_name}")
PYEOF

  success "  ${table}: ${count} items restored"
done

echo ""
success "Restore complete"