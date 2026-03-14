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
BUILD_ONLY=false                                          
[[ "${1:-}" == "--build-only" ]] && BUILD_ONLY=true      

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
    local handler_file="$2"

    info "  Zipping ${name}..."
    local staging="/tmp/lambda-${name}"
    rm -rf "${staging}" && mkdir -p "${staging}"

    # Copy compiled handler as index.js
    cp "dist/${handler_file}" "${staging}/index.js"

    # Copy all shared folders (services, data, shared)
    for dir in dist/data dist/services dist/shared; do
      [[ -d "${dir}" ]] && cp -r "${dir}" "${staging}/"
    done

    # Runtime dependencies
    cp -r node_modules "${staging}/"

    # Fix relative import paths in index.js
    sed -i 's|../../shared/|./shared/|g; s|../../services/|./services/|g; s|../../data/|./data/|g' "${staging}/index.js"

    cd "${staging}"
    zip -qr "${name}.zip" .
    mv "${name}.zip" "${ARTIFACTS_DIR}/${name}.zip"
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
# Frontend — build and deploy to S3 + CloudFront invalidation
# =============================================================================
deploy_frontend() {
  local frontend_dir="${REPO_ROOT}/../devops_attendance_app_frontend"
  [[ -d "${frontend_dir}" ]] || error "Frontend repo not found at ${frontend_dir}"

  info "Building frontend..."
  cd "${INFRA_DIR}"
  local api_endpoint
  api_endpoint=$(terraform output -raw api_endpoint)
  local bucket
  bucket=$(terraform output -raw frontend_bucket)
  local cf_id
  cf_id=$(terraform output -raw cloudfront_distribution_id)

  # Inject the new API URL into the frontend config
  local config_file="${frontend_dir}/src/config/api.ts"
  info "  Updating API URL to ${api_endpoint}..."
  sed -i "s|https://[a-z0-9]*.execute-api.eu-central-1.amazonaws.com|${api_endpoint%/}|g" "${config_file}"

  cd "${frontend_dir}"
  npm ci
  npm run build

  info "  Uploading to S3..."
  aws s3 sync dist/ "s3://${bucket}" \
    --delete \
    --profile "${AWS_PROFILE}" \
    --region "${AWS_REGION}"

  info "  Invalidating CloudFront cache..."
  MSYS_NO_PATHCONV=1 aws cloudfront create-invalidation \
    --distribution-id "${cf_id}" \
    --paths "/*" \
    --profile "${AWS_PROFILE}" > /dev/null

  success "Frontend deployed"
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

  if [[ "${BUILD_ONLY}" == "true" ]]; then  
    build_lambdas
    exit 0
  fi

  check_prerequisites                        

  if [[ "${DESTROY}" == "true" ]]; then
    tf_destroy
  else
    build_lambdas
    tf_apply
    deploy_frontend

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