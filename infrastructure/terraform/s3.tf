locals {
  bucket_videos_name = "${var.project_name}-videos"
  bucket_zips_name   = "${var.project_name}-zips"
}

# ── Bucket: Vídeos originais ──────────────────────────────────────────────────
resource "aws_s3_bucket" "videos" {
  bucket        = local.bucket_videos_name
  force_destroy = true

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Purpose     = "video-uploads"
  }
}

resource "aws_s3_bucket_versioning" "videos" {
  bucket = aws_s3_bucket.videos.id
  versioning_configuration {
    status = "Disabled"
  }
}

# Bloqueia acesso público (uploads via presigned URL não precisam de acesso público)
resource "aws_s3_bucket_public_access_block" "videos" {
  bucket                  = aws_s3_bucket.videos.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle: remove vídeos originais após 7 dias (economiza custos)
resource "aws_s3_bucket_lifecycle_configuration" "videos" {
  bucket = aws_s3_bucket.videos.id

  rule {
    id     = "expire-videos"
    status = "Enabled"

    filter {}

    expiration {
      days = 7
    }
  }
}

# ── Bucket: ZIPs gerados ─────────────────────────────────────────────────────
resource "aws_s3_bucket" "zips" {
  bucket        = local.bucket_zips_name
  force_destroy = true

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Purpose     = "zip-downloads"
  }
}

resource "aws_s3_bucket_public_access_block" "zips" {
  bucket                  = aws_s3_bucket.zips.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "zips" {
  bucket = aws_s3_bucket.zips.id

  rule {
    id     = "expire-zips"
    status = "Enabled"

    filter {}

    expiration {
      days = 3
    }
  }
}
