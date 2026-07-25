# =============================================================================
# infra-down.ps1  —  Destroi TODA a infraestrutura AWS (para economizar credito)
# Uso: .\infra-down.ps1
# =============================================================================

$tfDir = Join-Path $PSScriptRoot "infrastructure\terraform"

Write-Host ""
Write-Host "ATENCAO: isso vai destruir todos os recursos AWS criados pelo Terraform." -ForegroundColor Red
Write-Host "  - Repositorios ECR (api, processor, notification)" -ForegroundColor Red
Write-Host "  - Filas SQS (video-jobs, video-jobs-dlq, video-failures)" -ForegroundColor Red
Write-Host "  - Buckets S3 (hackaton-videos, hackaton-zips) e todo o conteudo" -ForegroundColor Red
Write-Host "  - IAM roles e policies" -ForegroundColor Red
Write-Host ""

$confirm = Read-Host "Digite 'sim' para confirmar"
if ($confirm -ne "sim") {
    Write-Host "Cancelado." -ForegroundColor Yellow
    exit 0
}

# ── Credenciais AWS Lab ───────────────────────────────────────────────────────
Write-Host ""
Write-Host "Cole as credenciais do AWS Lab (podem ser as mesmas da sessao atual)" -ForegroundColor Cyan
Write-Host ""

$env:AWS_ACCESS_KEY_ID     = Read-Host "AWS_ACCESS_KEY_ID"
$env:AWS_SECRET_ACCESS_KEY = Read-Host "AWS_SECRET_ACCESS_KEY"
$env:AWS_SESSION_TOKEN     = Read-Host "AWS_SESSION_TOKEN"
$env:AWS_DEFAULT_REGION    = "us-east-1"

Write-Host ""
Write-Host "Verificando identidade..." -ForegroundColor Gray
aws sts get-caller-identity
if ($LASTEXITCODE -ne 0) {
    Write-Host "Falha ao autenticar na AWS. Verifique as credenciais." -ForegroundColor Red
    exit 1
}

# ── Terraform destroy ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Destruindo infraestrutura..." -ForegroundColor Cyan
Set-Location $tfDir

terraform destroy -auto-approve
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Erro no destroy. Alguns recursos podem precisar ser removidos manualmente no console AWS." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Infraestrutura destruida. Nenhum recurso ativo na AWS." -ForegroundColor Green
Write-Host ""

Set-Location $PSScriptRoot
