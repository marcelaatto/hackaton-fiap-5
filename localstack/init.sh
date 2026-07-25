#!/bin/bash
# Script de inicialização do LocalStack
# Executado automaticamente quando o LocalStack estiver pronto
set -e

REGION="us-east-1"
ACCOUNT_ID="000000000000"

echo "==> [LocalStack] Criando filas SQS..."

# Dead Letter Queue (DLQ) - deve ser criada antes da fila principal
awslocal sqs create-queue \
  --queue-name video-jobs-dlq \
  --region $REGION

echo "    - video-jobs-dlq criada"

# Fila principal com RedrivePolicy apontando para a DLQ
# VisibilityTimeout=300s (5 min) deve ser maior que o tempo máximo de processamento
# de um vídeo de 2 minutos (download + FFmpeg + ZIP + upload ≈ 1-3 min)
awslocal sqs create-queue \
  --queue-name video-jobs \
  --region $REGION \
  --attributes "RedrivePolicy={\"deadLetterTargetArn\":\"arn:aws:sqs:${REGION}:${ACCOUNT_ID}:video-jobs-dlq\",\"maxReceiveCount\":\"3\"},VisibilityTimeout=300"

echo "    - video-jobs criada (DLQ: video-jobs-dlq, maxReceiveCount: 3)"

# Fila de falhas para o serviço de notificação
awslocal sqs create-queue \
  --queue-name video-failures \
  --region $REGION

echo "    - video-failures criada"

echo "==> [LocalStack] Criando buckets S3..."

# Bucket para os vídeos originais
awslocal s3 mb s3://hackaton-videos --region $REGION
echo "    - hackaton-videos criado"

# Bucket para os ZIPs gerados
awslocal s3 mb s3://hackaton-zips --region $REGION
echo "    - hackaton-zips criado"

echo "==> [LocalStack] Inicialização concluída com sucesso!"
echo ""
echo "    SQS Queues:"
echo "      - http://localhost:4566/000000000000/video-jobs"
echo "      - http://localhost:4566/000000000000/video-jobs-dlq"
echo "      - http://localhost:4566/000000000000/video-failures"
echo ""
echo "    S3 Buckets:"
echo "      - s3://hackaton-videos"
echo "      - s3://hackaton-zips"
