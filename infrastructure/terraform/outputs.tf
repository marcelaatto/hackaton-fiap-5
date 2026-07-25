output "s3_bucket_videos" {
  description = "Nome do bucket S3 para vídeos originais"
  value       = aws_s3_bucket.videos.id
}

output "s3_bucket_zips" {
  description = "Nome do bucket S3 para ZIPs gerados"
  value       = aws_s3_bucket.zips.id
}

output "sqs_queue_url" {
  description = "URL da fila SQS principal (video-jobs)"
  value       = aws_sqs_queue.video_jobs.url
}

output "sqs_dlq_url" {
  description = "URL da Dead Letter Queue (video-jobs-dlq)"
  value       = aws_sqs_queue.video_jobs_dlq.url
}

output "sqs_failures_queue_url" {
  description = "URL da fila de falhas (video-failures)"
  value       = aws_sqs_queue.video_failures.url
}

output "ecr_repository_urls" {
  description = "URLs dos repositórios ECR por serviço"
  value = {
    for k, v in aws_ecr_repository.services : k => v.repository_url
  }
}

output "aws_account_id" {
  description = "ID da conta AWS (usado para login no ECR)"
  value       = data.aws_caller_identity.current.account_id
}

