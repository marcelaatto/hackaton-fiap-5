$repo = "marcelaatto/hackaton-fiap-5"

function Set-GhSecret {
    param([string]$name, [string]$value)

    if ([string]::IsNullOrWhiteSpace($value)) {
        Write-Host "  SKIP  $name (vazio - ignorado)" -ForegroundColor Yellow
        return
    }

    $value | gh secret set $name --repo $repo 2>&1 | Out-Null

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK    $name" -ForegroundColor Green
    } else {
        Write-Host "  ERRO  $name  (verifique se gh esta autenticado)" -ForegroundColor Red
    }
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "GitHub CLI (gh) nao encontrado." -ForegroundColor Red
    Write-Host "Instale em: https://cli.github.com  e rode: gh auth login" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Configurando secrets - $repo" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Deixe em branco (Enter) para pular um secret" -ForegroundColor Gray
Write-Host ""

$awsAccessKey    = Read-Host "AWS_ACCESS_KEY_ID"
$awsSecretKey    = Read-Host "AWS_SECRET_ACCESS_KEY"
$awsSessionToken = Read-Host "AWS_SESSION_TOKEN"

Write-Host ""
Write-Host "Aplicando..." -ForegroundColor Cyan

Set-GhSecret "AWS_ACCESS_KEY_ID"     $awsAccessKey
Set-GhSecret "AWS_SECRET_ACCESS_KEY" $awsSecretKey
Set-GhSecret "AWS_SESSION_TOKEN"     $awsSessionToken

Write-Host ""
Write-Host "Concluido. Confira em:" -ForegroundColor Cyan
Write-Host "  https://github.com/$repo/settings/secrets/actions" -ForegroundColor White
Write-Host ""
