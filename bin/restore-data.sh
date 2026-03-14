#!/usr/bin/env bash
# =============================================================================
# restore-data.sh — Restore DynamoDB items and Cognito users from a backup
# created by backup-data.sh after a fresh terraform apply.
#
# Usage:
#   ./bin/restore-data.sh --dir ./backups/20260307_120000 --temp-password "Xxx1!"
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

AWS_PROFILE="terraform"
AWS_REGION="eu-central-1"

TEMP_PASSWORD=""
BACKUP_DIR=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir)           BACKUP_DIR="$2";    shift 2 ;;
    --temp-password) TEMP_PASSWORD="$2"; shift 2 ;;
    *) error "Unknown argument: $1" ;;
  esac
done

[[ -z "${BACKUP_DIR}" ]]    && error "Usage: ./bin/restore-data.sh --dir <backup_dir> --temp-password <password>"
[[ -z "${TEMP_PASSWORD}" ]] && error "Usage: ./bin/restore-data.sh --dir <backup_dir> --temp-password <password>"
[[ -d "${BACKUP_DIR}" ]]    || error "Backup directory not found: ${BACKUP_DIR}"

info "Restoring from: ${BACKUP_DIR}"

# =============================================================================
# Cognito restore
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

  local emails
  emails=$(node -e "
const fs = require('fs');
const users = JSON.parse(fs.readFileSync(process.argv[1])).Users;
users.forEach(u => {
  const attrs = {};
  u.Attributes.forEach(a => attrs[a.Name] = a.Value);
  if (attrs.email) console.log(attrs.email);
});
" "${users_file}")

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
      --region "${AWS_REGION}" > /dev/null || true
  done <<< "${emails}"

  success "Cognito users created"

  info "Restoring group memberships..."
  for group in Admins Students Teachers; do
    local group_file="${BACKUP_DIR}/cognito-group-${group}.json"
    [[ -f "${group_file}" ]] || continue

    local members
    members=$(node -e "
const fs = require('fs');
const users = JSON.parse(fs.readFileSync(process.argv[1])).Users;
users.forEach(u => {
  const attrs = {};
  u.Attributes.forEach(a => attrs[a.Name] = a.Value);
  if (attrs.email) console.log(attrs.email);
});
" "${group_file}")

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
# DynamoDB restore — batch-write items back using AWS CLI
# =============================================================================
restore_dynamodb() {
  local tables=("Users" "Courses" "Departments" "Enrollments" "Attendance")

  for table in "${tables[@]}"; do
    local file="${BACKUP_DIR}/${table}.json"
    [[ -f "${file}" ]] || { warn "  ${table}: backup file not found, skipping"; continue; }

    local count
    count=$(grep -A1 '"Count"' "${file}" | grep -o '[0-9]*' | tail -1)

    if [[ "${count}" -eq 0 ]]; then
      warn "  ${table}: 0 items, skipping"
      continue
    fi

    info "  Restoring ${table} (${count} items)..."

    node -e "
const fs = require('fs');
const { execSync } = require('child_process');

const data = JSON.parse(fs.readFileSync(process.argv[1]));
const items = data.Items;
const table = process.argv[2];
const profile = process.argv[3];
const region = process.argv[4];

const chunkSize = 25;
for (let i = 0; i < items.length; i += chunkSize) {
  const chunk = items.slice(i, i + chunkSize);
  const requests = chunk.map(item => ({ PutRequest: { Item: item } }));
  const payload = JSON.stringify({ [table]: requests });
  const tmpFile = '/tmp/dynamo-batch-' + Date.now() + '.json';
  fs.writeFileSync(tmpFile, payload);
  execSync('aws dynamodb batch-write-item --request-items file://' + tmpFile +
    ' --profile ' + profile + ' --region ' + region, { stdio: 'inherit' });
  fs.unlinkSync(tmpFile);
}
" "${file}" "${table}" "${AWS_PROFILE}" "${AWS_REGION}"

    success "  ${table}: ${count} items restored"
  done
}

# =============================================================================
# Remap user IDs — Cognito generates new sub UUIDs on every destroy+apply.
# This function:
#   1. Builds email -> old sub map from the cognito-users.json backup
#   2. Fetches email -> new sub map from the new Cognito user pool
#   3. Updates Users table: deletes old item, writes new one with new sub
#   4. Updates Enrollments and Attendance: replaces old studentID with new sub
# =============================================================================
remap_user_ids() {
  local users_file="${BACKUP_DIR}/Users.json"
  local cognito_backup="${BACKUP_DIR}/cognito-users.json"

  [[ -f "${users_file}" ]]   || { warn "No Users.json backup, skipping remap"; return; }
  [[ -f "${cognito_backup}" ]] || { warn "No cognito-users.json backup, skipping remap"; return; }

  local count
  count=$(grep -A1 '"Count"' "${users_file}" | grep -o '[0-9]*' | tail -1)
  [[ "${count}" -eq 0 ]] && { warn "Users table empty, skipping remap"; return; }

  info "Remapping user IDs to new Cognito subs..."

  # Fetch new user pool ID
  local user_pool_id
  user_pool_id=$(aws cognito-idp list-user-pools \
    --max-results 10 \
    --profile "${AWS_PROFILE}" \
    --region "${AWS_REGION}" \
    --query "UserPools[?Name=='User pool - jxixsa'].Id | [0]" \
    --output text)

  # Fetch new subs from Cognito into a temp file
  local new_subs_file="/tmp/new-subs-$$.json"
  aws cognito-idp list-users \
    --user-pool-id "${user_pool_id}" \
    --profile "${AWS_PROFILE}" \
    --region "${AWS_REGION}" \
    --query "Users[*].Attributes" \
    --output json > "${new_subs_file}"

  node -e "
const fs = require('fs');
const { execSync } = require('child_process');

const profile        = process.argv[1];
const region         = process.argv[2];
const usersFile      = process.argv[3];
const cognitoBackup  = process.argv[4];
const newSubsFile    = process.argv[5];

// Build email -> new sub from Cognito
const cognitoUsers = JSON.parse(fs.readFileSync(newSubsFile));
const emailToNewSub = {};
cognitoUsers.forEach(attrs => {
  const map = {};
  attrs.forEach(a => map[a.Name] = a.Value);
  if (map.email && map.sub) emailToNewSub[map.email] = map.sub;
});

// Build email -> old sub from backup
const backupCognito = JSON.parse(fs.readFileSync(cognitoBackup)).Users;
const emailToOldSub = {};
backupCognito.forEach(u => {
  const attrs = {};
  u.Attributes.forEach(a => attrs[a.Name] = a.Value);
  if (attrs.email && attrs.sub) emailToOldSub[attrs.email] = attrs.sub;
});

// Build old sub -> new sub remap
const remapSub = {};
Object.entries(emailToOldSub).forEach(([email, oldSub]) => {
  const newSub = emailToNewSub[email];
  if (newSub && oldSub !== newSub) {
    remapSub[oldSub] = newSub;
    console.log('  ' + email + ': ' + oldSub + ' -> ' + newSub);
  }
});

if (Object.keys(remapSub).length === 0) {
  console.log('  No remapping needed — subs unchanged');
  process.exit(0);
}

function dynamo(args) {
  execSync('aws dynamodb ' + args + ' --profile ' + profile + ' --region ' + region,
    { stdio: 'inherit' });
}

// Remap Users table
const backupUsers = JSON.parse(fs.readFileSync(usersFile)).Items;
backupUsers.forEach(item => {
  const oldSub = item.userID?.S;
  const newSub = remapSub[oldSub];
  if (!newSub) return;

  dynamo('delete-item --table-name Users --key \'' +
    JSON.stringify({ userID: { S: oldSub } }) + '\'');

  const newItem = { ...item, userID: { S: newSub } };
  const tmpFile = '/tmp/user-' + Date.now() + '.json';
  fs.writeFileSync(tmpFile, JSON.stringify(newItem));
  dynamo('put-item --table-name Users --item file://' + tmpFile);
  fs.unlinkSync(tmpFile);
});

// Remap Enrollments table
const enrollmentsFile = usersFile.replace('Users.json', 'Enrollments.json');
if (fs.existsSync(enrollmentsFile)) {
  const enrollments = JSON.parse(fs.readFileSync(enrollmentsFile)).Items;
  enrollments.forEach(item => {
    const oldSub = item.studentID?.S;
    const newSub = remapSub[oldSub];
    if (!newSub) return;

    dynamo('delete-item --table-name Enrollments --key \'' +
      JSON.stringify({ studentID: { S: oldSub }, courseID: item.courseID }) + '\'');

    const newItem = { ...item, studentID: { S: newSub } };
    const tmpFile = '/tmp/enroll-' + Date.now() + '.json';
    fs.writeFileSync(tmpFile, JSON.stringify(newItem));
    dynamo('put-item --table-name Enrollments --item file://' + tmpFile);
    fs.unlinkSync(tmpFile);
  });
}

// Remap Attendance table
const attendanceFile = usersFile.replace('Users.json', 'Attendance.json');
if (fs.existsSync(attendanceFile)) {
  const attendance = JSON.parse(fs.readFileSync(attendanceFile)).Items;
  attendance.forEach(item => {
    const oldSub = item.studentID?.S;
    const newSub = remapSub[oldSub];
    if (!newSub) return;

    dynamo('delete-item --table-name Attendance --key \'' +
      JSON.stringify({ studentID: { S: oldSub }, date_courseID: item.date_courseID }) + '\'');

    const newItem = { ...item, studentID: { S: newSub } };
    const tmpFile = '/tmp/att-' + Date.now() + '.json';
    fs.writeFileSync(tmpFile, JSON.stringify(newItem));
    dynamo('put-item --table-name Attendance --item file://' + tmpFile);
    fs.unlinkSync(tmpFile);
  });
}

console.log('Remap complete');
" "${AWS_PROFILE}" "${AWS_REGION}" "${users_file}" "${cognito_backup}" "${new_subs_file}"

  rm -f "${new_subs_file}"
  success "User ID remap complete"
}

# =============================================================================
# Main
# =============================================================================
restore_cognito
restore_dynamodb
remap_user_ids

echo ""
success "Restore complete"
warn "Cognito users must change their password on first login (temporary password: ${TEMP_PASSWORD})"