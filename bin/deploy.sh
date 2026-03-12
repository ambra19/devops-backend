#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Full pipeline for the Attendance App
#
# Usage:
#   ./deploy.sh            # build Lambdas + terraform apply
#   ./deploy.sh --destroy  # terraform destroy (Lambdas not rebuilt)
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/app"
ARTIFACTS_DIR="${REPO_ROOT}/infrastructure/artifacts"
INFRA_DIR="${REPO_ROOT}/infrastructure"
AWS_PROFILE="terraform"
AWS_REGION="eu-central-1"

DESTROY=false
[[ "${1:-}" == "--destroy" ]] && DESTROY=true

# =============================================================================
# Prerequisites
# =============================================================================
check_prerequisites() {
  info "Checking prerequisites..."
  command -v aws       >/dev/null 2>&1 || error "aws CLI not found"
  command -v terraform >/dev/null 2>&1 || error "terraform not found"
  command -v node      >/dev/null 2>&1 || error "node not found"
  command -v npm       >/dev/null 2>&1 || error "npm not found"
  command -v zip       >/dev/null 2>&1 || error "zip not found"
  aws sts get-caller-identity --profile "${AWS_PROFILE}" --region "${AWS_REGION}" \
    >/dev/null 2>&1 || error "AWS profile '${AWS_PROFILE}' invalid or expired"
  success "Prerequisites OK"
}

# =============================================================================
# Build Lambda zips
# Why: aws_lambda_function needs a .zip on disk at apply time.
# We compile TypeScript first, then zip each function individually so
# Terraform only re-deploys functions whose zip hash actually changed.
# =============================================================================
build_lambdas() {
  info "Building Lambda artifacts..."
  mkdir -p "${ARTIFACTS_DIR}"
  cd "${BACKEND_DIR}"

  info "  npm ci..."
  npm ci

  info "  tsc..."
  npm run build   # outputs to ./dist — adjust if your tsconfig outDir differs

  zip_lambda() {
    local name="$1"
    local handler_file="$2"   # path inside dist/, e.g. "functions/auth/login.js"

    info "  Zipping ${name}..."
    local staging="/tmp/lambda-${name}"
    rm -rf "${staging}" && mkdir -p "${staging}"

    # Copy compiled handler as index.js (consistent Lambda entry point)
    cp "dist/${handler_file}" "${staging}/index.js"

    # Copy shared utilities (rbac, ssm, types)
    cp -r dist/shared "${staging}/"

    # Runtime dependencies
    cp -r node_modules "${staging}/"

    cd "${staging}"
    zip -qr "${ARTIFACTS_DIR}/${name}.zip" .
    cd "${BACKEND_DIR}"
    rm -rf "${staging}"

    success "    → ${ARTIFACTS_DIR}/${name}.zip"
  }

  # ── Register each Lambda here ─────────────────────────────────────────────
  # First arg = zip name (must match what tf-module-lambda expects)
  # Second arg = compiled JS path inside dist/
  zip_lambda "attendance-auth-login"       "functions/auth/login.js"
  zip_lambda "attendance-auth-change-pass" "functions/auth/changePass.js"
  zip_lambda "get-enrollment"              "functions/enrollments/get-enrollment.js"
  zip_lambda "create-enrollment"           "functions/enrollments/create-enrollment.js"
  zip_lambda "delete-enrollment"           "functions/enrollments/delete-enrollment.js"
  zip_lambda "get-attendance"              "functions/attendance/get-attendance.js"
  zip_lambda "create-attendance"           "functions/attendance/create-attendance.js"
  zip_lambda "get-attendance-teacher"      "functions/attendance/get-attendance-teacher.js"
  zip_lambda "get-user"                    "functions/users/get-user.js"

  success "All Lambda artifacts built"
}

# =============================================================================
# Terraform — single apply covers Cognito + DynamoDB + Lambda in one shot.
# Terraform works out the dependency order itself from the module references
# in main.tf (e.g. module.lambda depends on module.cognito.user_pool_arn).
# =============================================================================
tf_apply() {
  info "Terraform init..."
  cd "${INFRA_DIR}"
  terraform init -reconfigure -input=false

  info "Terraform validate..."
  terraform validate

  info "Terraform apply..."
  terraform apply -auto-approve -input=false
  success "Terraform apply complete"
}

tf_destroy() {
  warn "=== DESTROYING ALL INFRASTRUCTURE ==="

  # Always back up DynamoDB data before destroying — tables and their
  # items will be permanently deleted by terraform destroy.
  info "Backing up DynamoDB data first..."
  "${REPO_ROOT}/bin/backup-data.sh"

  warn "Continuing in 5 seconds... Ctrl+C to abort"
  sleep 5
  cd "${INFRA_DIR}"
  terraform init -reconfigure -input=false
  terraform destroy -auto-approve -input=false
  success "All infrastructure destroyed"
  echo ""
  info "Data backed up. After next apply, restore with:"
  info "  ./bin/restore-data.sh --dir <backup_dir>"
}

# =============================================================================
# Main
# =============================================================================
main() {
  echo ""
  echo -e "${BLUE}==========================================${NC}"
  echo -e "${BLUE}  Attendance App — Deployment Pipeline   ${NC}"
  echo -e "${BLUE}==========================================${NC}"
  echo ""

  check_prerequisites

  if [[ "${DESTROY}" == "true" ]]; then
    tf_destroy
  else
    build_lambdas
    tf_apply

    echo ""
    echo -e "${GREEN}==========================================${NC}"
    echo -e "${GREEN}  Deployment complete!                   ${NC}"
    echo -e "${GREEN}==========================================${NC}"
    echo ""
    cd "${INFRA_DIR}"
    info "API endpoint: $(terraform output -raw api_endpoint 2>/dev/null || echo 'not yet available')"
  fi
}

main "$@"