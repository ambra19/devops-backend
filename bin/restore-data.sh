#!/usr/bin/env bash
# =============================================================================
# restore-data.sh — Restore DynamoDB items and Cognito users from a backup
# created by backup-data.sh after a fresh terraform apply.
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
# Temporary password assigned to all restored Cognito users.
# They must change it on first login via the change-password flow.
TEMP_PASSWORD=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir)           BACKUP_DIR="$2";    shift 2 ;;
    --temp-password) TEMP_PASSWORD="$2"; shift 2 ;;
    *) error "Unknown argument: $1" ;;
  esac
done

[[ -z "${TEMP_PASSWORD}" ]] && error "Usage: ./bin/restore-data.sh --dir <backup_dir> --temp-password <password>"

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

# =============================================================================
# Cognito restore
# Passwords cannot be restored — users get a temporary password and must
# go through the change-password flow on first login.
# =============================================================================
restore_cognito() {
  local users_file="${BACKUP_DIR}/cognito-users.json"
  [[ -f "${users_file}" ]] || { warn "No Cognito backup found, skipping"; return; }

  info "Fetching new User Pool ID..."
  local user_pool_id
  user_pool_id=$(aws cognito-idp list-user-pools \
    --max-results 10 \
    --profile "${AWS_PROFILE}" \
    --region "${AWS_REGION}" \
    --query "UserPools[?Name=='User pool - jxixsa'].Id | [0]" \
    --output text)

  [[ "${user_pool_id}" == "None" || -z "${user_pool_id}" ]] && \
    error "Could not find Cognito User Pool — run terraform apply first"

  info "Restoring Cognito users (passwords reset to temporary)..."

  # Re-create each user with a temporary password
  local emails
  emails=$(python3 -c "
import json, sys
users = json.load(open('${users_file}'))['Users']
for u in users:
    attrs = {a['Name']: a['Value'] for a in u['Attributes']}
    print(attrs.get('email', ''))
")

  while IFS= read -r email; do
    [[ -z "${email}" ]] && continue
    info "  Creating user: ${email}"
    aws cognito-idp admin-create-user \
      --user-pool-id "${user_pool_id}" \
      --username "${email}" \
      --temporary-password "${TEMP_PASSWORD}" \
      --user-attributes Name=email,Value="${email}" Name=email_verified,Value=true \
      --message-action SUPPRESS \
      --profile "${AWS_PROFILE}" \
      --region "${AWS_REGION}" > /dev/null
  done <<< "${emails}"

  success "Cognito users created"

  # Restore group memberships
  info "Restoring group memberships..."
  for group in Admins Students Teachers; do
    local group_file="${BACKUP_DIR}/cognito-group-${group}.json"
    [[ -f "${group_file}" ]] || continue

    local members
    members=$(python3 -c "
import json
users = json.load(open('${group_file}'))['Users']
for u in users:
    attrs = {a['Name']: a['Value'] for a in u['Attributes']}
    print(attrs.get('email', ''))
")

    while IFS= read -r email; do
      [[ -z "${email}" ]] && continue
      aws cognito-idp admin-add-user-to-group \
        --user-pool-id "${user_pool_id}" \
        --username "${email}" \
        --group-name "${group}" \
        --profile "${AWS_PROFILE}" \
        --region "${AWS_REGION}"
    done <<< "${members}"

    success "  ${group} memberships restored"
  done
}

# =============================================================================
# DynamoDB restore — only processes the known table files, not cognito files
# =============================================================================
restore_dynamodb() {
  if ! python3 -c "import boto3" 2>/dev/null; then
    info "boto3 not found — installing..."
    pip3 install boto3 --quiet || error "Failed to install boto3"
  fi

  local tables=("Users" "Courses" "Departments" "Enrollments" "Attendance")

  for table in "${tables[@]}"; do
    local file="${BACKUP_DIR}/${table}.json"
    [[ -f "${file}" ]] || { warn "  ${table}: backup file not found, skipping"; continue; }

    local count
    count=$(python3 -c "import json; print(json.load(open('${file}'))['Count'])")

    if [[ "${count}" -eq 0 ]]; then
      warn "  ${table}: 0 items, skipping"
      continue
    fi

    info "  Restoring ${table} (${count} items)..."

    python3 - "${file}" "${table}" <<'PYEOF'
import json, sys, boto3

backup_file = sys.argv[1]
table_name  = sys.argv[2]

with open(backup_file) as f:
    items = json.load(f)["Items"]

resource = boto3.resource("dynamodb", region_name="eu-central-1")
table    = resource.Table(table_name)

chunk_size = 25
for i in range(0, len(items), chunk_size):
    chunk = items[i:i + chunk_size]
    with table.batch_writer() as batch:
        for item in chunk:
            deserializer = boto3.dynamodb.types.TypeDeserializer()
            plain = {k: deserializer.deserialize(v) for k, v in item.items()}
            batch.put_item(Item=plain)

print(f"  Restored {len(items)} items into {table_name}")
PYEOF

    success "  ${table}: ${count} items restored"
  done
}

# =============================================================================
# Main
# =============================================================================
restore_cognito
restore_dynamodb

echo ""
success "Restore complete"
warn "Cognito users must change their password on first login (temporary password: ${TEMP_PASSWORD})"