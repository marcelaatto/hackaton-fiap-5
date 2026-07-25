terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Descomente para usar S3 como backend de estado em produção
  # backend "s3" {
  #   bucket = "hackaton-terraform-state"
  #   key    = "hackaton/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region

  # Credenciais via variáveis de ambiente:
  # AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN
}

# Usado para obter o account_id atual (output + login ECR)
data "aws_caller_identity" "current" {}

