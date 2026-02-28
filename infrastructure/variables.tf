variable "app_name" {
  type        = string
  description = "Application name, used as a prefix for all resources"
  default     = "attendance-app"
}

variable "aws_region" {
  type    = string
  default = "eu-west-1"
}

variable "aws_profile" {
  type    = string
  default = "terraform"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"
  default     = "192.168.0.0/16"
}

variable "cognito_user_pool_name" {
  type        = string
  description = "Exact name of the Cognito User Pool created by your teammate"
}

variable "cognito_client_name" {
  type        = string
  description = "Name for the Cognito App Client"
}

variable "cognito_generate_client_secret" {
  type        = bool
  description = "Whether the App Client should have a secret — ask your teammate"
  default     = false
}
