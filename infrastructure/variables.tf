variable "aws_region" {
  type    = string
  default = "eu-central-1"
}

variable "aws_profile" {
  type    = string
  default = "terraform"
}

variable "cognito_user_pool_name" {
  type        = string
  description = "Exact name of the existing Cognito User Pool"
}
