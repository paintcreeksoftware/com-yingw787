terraform {
  required_version = "= 1.12.2"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "= 6.25.0"
    }
  }

  backend "s3" {
    key          = "yingw787.com/site.tfstate"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type        = string
  description = "Region for the website bucket."
  default     = "us-east-1"
}

variable "site_bucket_name" {
  type        = string
  description = "Globally unique name for the private website bucket."
}
