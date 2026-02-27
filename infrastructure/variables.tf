variable "app_name" {
  type        = string
  description = "Application name, used as a prefix for all resources"
  default     = "attendance-app"
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev | staging | prod)"
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod"
  }
}

variable "aws_region" {
  type    = string
  default = "eu-west-1"
}

variable "aws_profile" {
  type    = string
  default = "terraform"
}

# ─── Networking ──────────────────────────────────────────────────────────────
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  type        = list(string)
  description = "List of AZs to deploy into"
  default     = ["eu-west-1a", "eu-west-1b"]
}

variable "private_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.101.0/24", "10.0.102.0/24"]
}

# ─── Lambda ──────────────────────────────────────────────────────────────────
variable "lambda_zip_path" {
  type        = string
  description = "Path to the compiled Lambda zip file"
  default     = "../app/lambda.zip"
}

variable "lambda_handler" {
  type    = string
  default = "index.handler"
}

variable "lambda_runtime" {
  type    = string
  default = "nodejs22.x"
}

variable "dynamodb_table_arn" {
  type        = string
  description = "ARN of the DynamoDB table Lambda needs read/write access to"
}

# ─── Cognito (pre-existing) ───────────────────────────────────────────────────
variable "cognito_user_pool_name" {
  type        = string
  description = "Exact name of the Cognito User Pool already created by your teammate"
}
