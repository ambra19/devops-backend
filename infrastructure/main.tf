###############################################################################
# ROOT MODULE — Attendance App Infrastructure
#
# Module sources are currently local paths. To switch to VCS (GitHub), replace
# each source with the git URL, for example:
#
#   source = "git::https://github.com/<org>/tf-module-lambda.git?ref=v1.0.0"
#   source = "git::https://github.com/<org>/tf-module-cognito.git?ref=v1.0.0"
#   source = "git::https://github.com/<org>/tf-module-api-gateway.git?ref=v1.0.0"
#
# See: https://developer.hashicorp.com/terraform/language/modules/sources#github
###############################################################################

# ─── VPC ─────────────────────────────────────────────────────────────────────
# Using the public AWS VPC registry module instead of a hand-rolled one.
# https://registry.terraform.io/modules/terraform-aws-modules/vpc/aws/latest
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.app_name}-${var.environment}-vpc"
  cidr = var.vpc_cidr

  azs             = var.availability_zones
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs

  # NAT Gateway lets Lambda in private subnets reach the internet / AWS APIs
  enable_nat_gateway   = true
  single_nat_gateway   = var.environment != "prod" # save cost in non-prod
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = local.common_tags
}

# ─── COGNITO ─────────────────────────────────────────────────────────────────
# Cognito was already provisioned by a teammate — this module only reads it.
# Ask your teammate for the exact User Pool name and set it in variables.tf
# or pass it via -var="cognito_user_pool_name=..." at plan/apply time.
module "cognito" {
  source = "./modules/cognito"
  # source = "git::https://github.com/<org>/tf-module-cognito.git?ref=v1.0.0"

  user_pool_name = var.cognito_user_pool_name
}

# ─── LAMBDA ──────────────────────────────────────────────────────────────────
module "lambda" {
  source = "./modules/lambda"
  # source = "git::https://github.com/<org>/tf-module-lambda.git?ref=v1.0.0"

  app_name    = var.app_name
  environment = var.environment

  lambda_zip_path = var.lambda_zip_path
  handler         = var.lambda_handler
  runtime         = var.lambda_runtime

  # Networking — place Lambda in private subnets so it can't be reached directly
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnets
  dynamodb_table_arn = var.dynamodb_table_arn

  # Pass Cognito pool ID so Lambda can validate tokens if needed at runtime
  cognito_user_pool_id = module.cognito.user_pool_id

  tags = local.common_tags
}

# ─── API GATEWAY ─────────────────────────────────────────────────────────────
module "api_gateway" {
  source = "./modules/api-gateway"
  # source = "git::https://github.com/<org>/tf-module-api-gateway.git?ref=v1.0.0"

  app_name    = var.app_name
  environment = var.environment

  lambda_invoke_arn      = module.lambda.invoke_arn
  lambda_function_name   = module.lambda.function_name
  cognito_user_pool_arn  = module.cognito.user_pool_arn
  cognito_user_pool_id   = module.cognito.user_pool_id

  tags = local.common_tags
}

# ─── Locals ──────────────────────────────────────────────────────────────────
locals {
  common_tags = {
    Project     = var.app_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
