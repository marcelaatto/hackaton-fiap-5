# =============================================================================
# infra-up.ps1  —  Sobe a infraestrutura AWS via Terraform
# Uso: .\infra-up.ps1
# =============================================================================

$tfDir = Join-Path $PSScriptRoot "infrastructure\terraform"

# ── 1. Credenciais AWS Lab ────────────────────────────────────────────────────
Write-Host ""
Write-Host "Cole as credenciais do AWS Lab (AWS Academy / Learner Lab)" -ForegroundColor Cyan
Write-Host "  No painel do Lab: AWS Details > AWS CLI > copie os 3 valores abaixo" -ForegroundColor Gray
Write-Host ""

$env:AWS_ACCESS_KEY_ID     = Read-Host "AWS_ACCESS_KEY_ID"
$env:AWS_SECRET_ACCESS_KEY = Read-Host "AWS_SECRET_ACCESS_KEY"
$env:AWS_SESSION_TOKEN     = Read-Host "AWS_SESSION_TOKEN"
$env:AWS_DEFAULT_REGION    = "us-east-1"

# Validacao rapida
if ([string]::IsNullOrWhiteSpace($env:AWS_ACCESS_KEY_ID)) {
    Write-Host "Credenciais invalidas. Abortando." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Credenciais configuradas. Verificando identidade..." -ForegroundColor Gray
aws sts get-caller-identity
if ($LASTEXITCODE -ne 0) {
    Write-Host "Falha ao autenticar na AWS. Verifique as credenciais." -ForegroundColor Red
    exit 1
}

# ── 2. Terraform init ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[ 1/3 ] terraform init..." -ForegroundColor Cyan
Set-Location $tfDir
terraform init -upgrade
if ($LASTEXITCODE -ne 0) { Write-Host "Erro no terraform init." -ForegroundColor Red; exit 1 }

# ── 3. Terraform plan ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "[ 2/3 ] terraform plan..." -ForegroundColor Cyan
terraform plan -out=tfplan
if ($LASTEXITCODE -ne 0) { Write-Host "Erro no terraform plan." -ForegroundColor Red; exit 1 }

# ── 4. Terraform apply ───────────────────────────────────────────────────────
Write-Host ""
Write-Host "[ 3/3 ] terraform apply..." -ForegroundColor Cyan
terraform apply tfplan
if ($LASTEXITCODE -ne 0) { Write-Host "Erro no terraform apply." -ForegroundColor Red; exit 1 }

# ── 5. Mostrar outputs ───────────────────────────────────────────────────────
Write-Host ""
Write-Host "Infraestrutura criada com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Outputs:" -ForegroundColor Cyan
terraform output

Write-Host ""
Write-Host "Proximo passo: faca push para a branch main para disparar o pipeline CI/CD." -ForegroundColor Yellow
Write-Host "Para destruir tudo depois: .\infra-down.ps1" -ForegroundColor Yellow
Write-Host ""

Set-Location $PSScriptRoot
