# =============================================================================
# Export all DynamoDB table items to JSON files before running terraform destroy.
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

info "Backing up Cognito users..."

USER_POOL_ID=$(aws cognito-idp list-user-pools \
  --max-results 10 \
  --profile "${AWS_PROFILE}" \
  --region "${AWS_REGION}" \
  --query "UserPools[?Name=='User pool - jxixsa'].Id | [0]" \
  --output text)

[[ "${USER_POOL_ID}" == "None" || -z "${USER_POOL_ID}" ]] && \
  error "Could not find Cognito User Pool"

aws cognito-idp list-users \
  --user-pool-id "${USER_POOL_ID}" \
  --profile "${AWS_PROFILE}" \
  --region "${AWS_REGION}" \
  --output json > "${BACKUP_DIR}/cognito-users.json"

for group in Admins Students Teachers; do
  aws cognito-idp list-users-in-group \
    --user-pool-id "${USER_POOL_ID}" \
    --group-name "${group}" \
    --profile "${AWS_PROFILE}" \
    --region "${AWS_REGION}" \
    --output json > "${BACKUP_DIR}/cognito-group-${group}.json"
done
success "Cognito users backed up (NOTE: passwords cannot be exported)"

TABLES=("Users" "Courses" "Departments" "Enrollments" "Attendance")

for table in "${TABLES[@]}"; do
  info "  Scanning ${table}..."

  aws dynamodb scan \
    --table-name "${table}" \
    --profile "${AWS_PROFILE}" \
    --region "${AWS_REGION}" \
    --output json > "${BACKUP_DIR}/${table}.json"

  count=$(grep -o '"Count":[0-9]*' "${BACKUP_DIR}/${table}.json" | grep -o '[0-9]*$')
  success "  ${table}: ${count} items saved"
done

echo ""
success "Backup complete: ${BACKUP_DIR}"
echo ""
info "To restore after apply: ./bin/restore-data.sh --dir ${BACKUP_DIR}"