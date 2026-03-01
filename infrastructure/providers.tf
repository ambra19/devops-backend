terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  backend "s3" {
    bucket  = "attendance-app-terraform-bucket"
    key     = "key/terraform.tfstate"
    region  = "eu-central-1"
    profile = "terraform"
    encrypt = true
  }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}