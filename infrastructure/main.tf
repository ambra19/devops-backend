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


# module "vpc" {
#   source  = "terraform-aws-modules/vpc/aws"
#   version = "~> 5.0"

#   name = "attendance-app-vpc"
#   cidr = var.vpc_cidr

#   # NAT Gateway lets Lambda in private subnets reach the internet / AWS APIs
#   enable_nat_gateway   = true
#   # single_nat_gateway   = var.environment != "prod"
#   enable_dns_hostnames = true
#   enable_dns_support   = true
# }

module "cognito" {
  source = "./modules/cognito"
  # source = "git::https://github.com/<org>/tf-module-cognito.git?ref=v1.0.0"

  user_pool_name = var.cognito_user_pool_name
}

