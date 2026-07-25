# AWS Lab nao permite criar IAM roles customizadas.
# O Lab ja fornece o LabRole com as permissoes necessarias.
# Este data source referencia o LabRole existente para uso em outputs.
data "aws_iam_role" "lab_role" {
  name = "LabRole"
}
