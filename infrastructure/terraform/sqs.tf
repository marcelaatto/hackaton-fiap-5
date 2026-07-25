# ── Dead Letter Queue (deve ser criada antes da fila principal) ───────────────
resource "aws_sqs_queue" "video_jobs_dlq" {
  name                       = "${var.project_name}-video-jobs-dlq"
  message_retention_seconds  = 1209600 # 14 dias

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# ── Fila principal de processamento ──────────────────────────────────────────
resource "aws_sqs_queue" "video_jobs" {
  name                       = "${var.project_name}-video-jobs"
  visibility_timeout_seconds = 300 # 5 min (deve ser >= tempo de processamento)
  message_retention_seconds  = 86400 # 1 dia
  receive_wait_time_seconds  = 20    # Long polling

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.video_jobs_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# ── Fila de falhas para o Notification service ────────────────────────────────
resource "aws_sqs_queue" "video_failures" {
  name                      = "${var.project_name}-video-failures"
  message_retention_seconds = 86400 # 1 dia

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}
