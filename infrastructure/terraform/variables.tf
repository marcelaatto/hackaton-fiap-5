variable "aws_region" {
  description = "Região AWS onde os recursos serão criados"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Ambiente de deploy (development, staging, production)"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Nome do projeto, usado como prefixo nos recursos"
  type        = string
  default     = "hackaton"
}
