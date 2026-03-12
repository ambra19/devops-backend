#!/usr/bin/env bash
# =============================================================================
# import-existing.sh — One-time script to import manually-created AWS
# resources into Terraform state.
#
# Run this ONCE before running deploy.sh for the first time.
# After importing, run `terraform plan` in infrastructure/ — it should show
# no changes (or only expected drift you then fix in your .tf files).
#
# Why this is necessary:
#   You built everything manually in AWS. If you just run `terraform apply`
#   with resource blocks, Terraform will try to CREATE new resources and
#   fail on name conflicts or create duplicates.
#   Importing tells Terraform "this existing AWS resource is now owned by
#   this resource block."
#
# Important for DynamoDB:
#   Import only pulls the table DEFINITION into state — all items are
#   untouched. However, `terraform destroy` WILL delete the tables and
#   their data. Run backup-data.sh before any destroy.
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="${REPO_ROOT}/infrastructure"
AWS_PROFILE="terraform"
AWS_REGION="eu-central-1"

# =============================================================================
# Fetch existing resource IDs from AWS
# =============================================================================
info "Fetching existing resource IDs from AWS..."

USER_POOL_ID=$(aws cognito-idp list-user-pools \
  --max-results 10 \
  --profile "${AWS_PROFILE}" \
  --region "${AWS_REGION}" \
  --query "UserPools[?Name=='User pool - jxixsa'].Id | [0]" \
  --output text)

[[ "${USER_POOL_ID}" == "None" || -z "${USER_POOL_ID}" ]] && \
  error "Could not find Cognito User Pool named 'User pool - jxixsa'"
info "  User Pool ID: ${USER_POOL_ID}"

CLIENT_ID=$(aws cognito-idp list-user-pool-clients \
  --user-pool-id "${USER_POOL_ID}" \
  --profile "${AWS_PROFILE}" \
  --region "${AWS_REGION}" \
  --query "UserPoolClients[0].ClientId" \
  --output text)
info "  App Client ID: ${CLIENT_ID}"

API_ID=$(aws apigatewayv2 get-apis \
  --profile "${AWS_PROFILE}" \
  --region "${AWS_REGION}" \
  --query "Items[?Name=='attendance'].ApiId | [0]" \
  --output text)
info "  API Gateway ID: ${API_ID}"

AUTHORIZER_ID=$(aws apigatewayv2 get-authorizers \
  --api-id "${API_ID}" \
  --profile "${AWS_PROFILE}" \
  --region "${AWS_REGION}" \
  --query "Items[?Name=='cognito-jwt'].AuthorizerId | [0]" \
  --output text)
info "  JWT Authorizer ID: ${AUTHORIZER_ID}"

# =============================================================================
# Init Terraform (needed before any import)
# =============================================================================
info "Terraform init..."
cd "${INFRA_DIR}"
terraform init -reconfigure -input=false

# =============================================================================
# Import: DynamoDB tables
# Resource address pattern: module.<module_name>.aws_dynamodb_table.<resource_name>
# Import ID for DynamoDB = table name
# =============================================================================
info "Importing DynamoDB tables..."

terraform import module.dynamodb.aws_dynamodb_table.attendance  "Attendance"
terraform import module.dynamodb.aws_dynamodb_table.courses     "Courses"
terraform import module.dynamodb.aws_dynamodb_table.departments "Departments"
terraform import module.dynamodb.aws_dynamodb_table.enrollments "Enrollments"
terraform import module.dynamodb.aws_dynamodb_table.users       "Users"

success "DynamoDB tables imported"

# =============================================================================
# Import: DynamoDB SSM parameters
# Import ID for SSM = parameter name (full path)
# =============================================================================
info "Importing DynamoDB SSM parameters..."

terraform import module.dynamodb.aws_ssm_parameter.attendance_table  "/attendance-app/dynamodb/attendance_table"
terraform import module.dynamodb.aws_ssm_parameter.courses_table     "/attendance-app/dynamodb/courses_table"
terraform import module.dynamodb.aws_ssm_parameter.departments_table "/attendance-app/dynamodb/departments_table"
terraform import module.dynamodb.aws_ssm_parameter.enrollments_table "/attendance-app/dynamodb/enrollments_table"
terraform import module.dynamodb.aws_ssm_parameter.users_table       "/attendance-app/dynamodb/users_table"

success "DynamoDB SSM parameters imported"

# =============================================================================
# Import: Cognito
# Resource address pattern: module.cognito.aws_cognito_user_pool.<resource_name>
# =============================================================================
info "Importing Cognito resources..."

terraform import module.cognito.aws_cognito_user_pool.this        "${USER_POOL_ID}"
terraform import module.cognito.aws_cognito_user_pool_client.this "${USER_POOL_ID}/${CLIENT_ID}"
terraform import module.cognito.aws_cognito_user_group.admins     "${USER_POOL_ID}/Admins"
terraform import module.cognito.aws_cognito_user_group.students   "${USER_POOL_ID}/Students"
terraform import module.cognito.aws_cognito_user_group.teachers   "${USER_POOL_ID}/Teachers"

terraform import module.cognito.aws_ssm_parameter.user_pool_id "/attendance-app/cognito/user_pool_id" 2>/dev/null || \
  warn "SSM user_pool_id not found — will be created on apply"
terraform import module.cognito.aws_ssm_parameter.client_id "/attendance-app/cognito/client_id" 2>/dev/null || \
  warn "SSM client_id not found — will be created on apply"

success "Cognito resources imported"

# =============================================================================
# Import: Lambda functions and IAM roles
# Resource address pattern for map resources:
#   module.lambda.aws_lambda_function.this["<key>"]
# The key must match the key in var.lambda_function_names / var.lambda_role_names
# Import ID for Lambda = function name
# Import ID for IAM role = role name
# =============================================================================
info "Importing Lambda functions..."

terraform import 'module.lambda.aws_lambda_function.this["auth_login"]'        "attendance-auth-login"
terraform import 'module.lambda.aws_lambda_function.this["auth_change_pass"]'  "attendance-auth-change-pass"
terraform import 'module.lambda.aws_lambda_function.this["create_enrollment"]' "create-enrollment"
terraform import 'module.lambda.aws_lambda_function.this["get_enrollment"]'    "get-enrollment"
terraform import 'module.lambda.aws_lambda_function.this["delete_enrollment"]' "delete-enrollment"
terraform import 'module.lambda.aws_lambda_function.this["get_attendance"]'         "get-attendance"
terraform import 'module.lambda.aws_lambda_function.this["create_attendance"]'      "create-attendance"
terraform import 'module.lambda.aws_lambda_function.this["get_attendance_teacher"]' "get-attendance-teacher"
terraform import 'module.lambda.aws_lambda_function.this["get_user"]'               "get-user"

success "Lambda functions imported"

info "Importing Lambda IAM roles..."

terraform import 'module.lambda.aws_iam_role.this["auth_login"]'        "attendance-auth-login-role-9mcyza6k"
terraform import 'module.lambda.aws_iam_role.this["auth_change_pass"]'  "attendance-auth-change-pass-role-yat4fkjo"
terraform import 'module.lambda.aws_iam_role.this["create_enrollment"]' "create-enrollment-role-minowcue"
terraform import 'module.lambda.aws_iam_role.this["get_enrollment"]'    "get-enrollment-role-viifxjco"
terraform import 'module.lambda.aws_iam_role.this["delete_enrollment"]' "delete-enrollment-role-4q5ulhw6"
terraform import 'module.lambda.aws_iam_role.this["get_attendance"]'         "get-attendance-role-yjtdsvfr"
terraform import 'module.lambda.aws_iam_role.this["create_attendance"]'      "create-attendance-role-bnanlirl"
terraform import 'module.lambda.aws_iam_role.this["get_attendance_teacher"]' "get-attendance-teacher-role-5dcfccw6" 
terraform import 'module.lambda.aws_iam_role.this["get_user"]'               "get-user-role-5nqtsu95"

success "Lambda IAM roles imported"

# IAM policies (import ID = policy ARN, fetched dynamically)
info "Importing Lambda IAM policies..."

SSM_POLICY_ARN=$(aws iam list-policies \
  --profile "${AWS_PROFILE}" \
  --query "Policies[?PolicyName=='attendance-app-lambda-ssm-read'].Arn | [0]" \
  --output text 2>/dev/null || echo "None")

DYNAMO_POLICY_ARN=$(aws iam list-policies \
  --profile "${AWS_PROFILE}" \
  --query "Policies[?PolicyName=='attendance-app-lambda-dynamodb-access'].Arn | [0]" \
  --output text 2>/dev/null || echo "None")

[[ "${SSM_POLICY_ARN}" != "None" ]] && \
  terraform import module.lambda.aws_iam_policy.ssm_read "${SSM_POLICY_ARN}" || \
  warn "SSM read policy not found — will be created on apply"

[[ "${DYNAMO_POLICY_ARN}" != "None" ]] && \
  terraform import module.lambda.aws_iam_policy.dynamodb_access "${DYNAMO_POLICY_ARN}" || \
  warn "DynamoDB access policy not found — will be created on apply"

success "Lambda IAM policies imported"

# =============================================================================
# Import: API Gateway
# =============================================================================
info "Importing API Gateway..."

terraform import module.api_gateway.aws_apigatewayv2_api.this "${API_ID}"

STAGE_ID=$(aws apigatewayv2 get-stages \
  --api-id "${API_ID}" \
  --profile "${AWS_PROFILE}" \
  --region "${AWS_REGION}" \
  --query "Items[?StageName=='\$default'].StageName | [0]" \
  --output text)

[[ "${STAGE_ID}" != "None" ]] && \
  terraform import module.api_gateway.aws_apigatewayv2_stage.default "${API_ID}/\$default" || \
  warn "Default stage not found — will be created on apply"

[[ "${AUTHORIZER_ID}" != "None" ]] && \
  terraform import module.api_gateway.aws_apigatewayv2_authorizer.jwt "${API_ID}/${AUTHORIZER_ID}" || \
  warn "JWT authorizer not found — will be created on apply"

success "API Gateway imported"

# =============================================================================
# Import: Frontend S3 + CloudFront
# =============================================================================
info "Importing frontend S3 bucket..."
terraform import module.frontend.aws_s3_bucket.frontend "devops-attendance-app-frontend-bucket"
terraform import module.frontend.aws_s3_bucket_public_access_block.frontend "devops-attendance-app-frontend-bucket"

terraform import module.frontend.aws_s3_bucket_policy.frontend "devops-attendance-app-frontend-bucket" 2>/dev/null || \
  warn "S3 bucket policy not found — will be created on apply"

info "Importing CloudFront distribution..."
terraform import module.frontend.aws_cloudfront_distribution.frontend "E1580BD743CYKV"

FRONTEND_OAC_ID=$(aws cloudfront list-origin-access-controls \
  --profile "${AWS_PROFILE}" \
  --query "OriginAccessControlList.Items[?Name=='devops-attendance-app-frontend-bucket-oac'].Id | [0]" \
  --output text 2>/dev/null || echo "None")

[[ "${FRONTEND_OAC_ID}" != "None" && -n "${FRONTEND_OAC_ID}" ]] && \
  terraform import module.frontend.aws_cloudfront_origin_access_control.frontend "${FRONTEND_OAC_ID}" || \
  warn "CloudFront OAC not found — will be created on apply"

success "Frontend resources imported"

# =============================================================================
# Import: CloudWatch Log Groups
# =============================================================================
info "Importing CloudWatch log groups..."

declare -A LOG_GROUP_FUNCTIONS=(
  ["auth_login"]="attendance-auth-login"
  ["auth_change_pass"]="attendance-auth-change-pass"
  ["create_enrollment"]="create-enrollment"
  ["get_enrollment"]="get-enrollment"
  ["delete_enrollment"]="delete-enrollment"
  ["get_attendance"]="get-attendance"
  ["create_attendance"]="create-attendance"
  ["get_attendance_teacher"]="get-attendance-teacher"
  ["get_user"]="get-user"
)

for key in "${!LOG_GROUP_FUNCTIONS[@]}"; do
  fn="${LOG_GROUP_FUNCTIONS[$key]}"
  terraform import "module.lambda.aws_cloudwatch_log_group.this[\"${key}\"]" \
    "/aws/lambda/${fn}" 2>/dev/null || \
    warn "Log group /aws/lambda/${fn} not found — will be created on apply"
done

success "CloudWatch log groups imported"

# =============================================================================
# Final
# =============================================================================
echo ""
echo -e "${GREEN}Import complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. cd infrastructure && terraform plan"
echo "  2. Fix any drift shown (your .tf config must match AWS reality)"
echo "  3. Once plan shows 'No changes', run ./bin/deploy.sh"
echo ""
warn "Remember: terraform destroy will delete DynamoDB data."
warn "Always run ./bin/backup-data.sh before destroying."