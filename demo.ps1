# =============================================================================
# demo.ps1  —  Demonstracao completa do Sistema de Processamento de Videos
# Uso: .\demo.ps1
# Prerequisito: Docker Desktop em execucao
# =============================================================================

$API = "http://localhost:3001"

function Write-Step($num, $msg) {
    Write-Host ""
    Write-Host "─────────────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host "  PASSO $num — $msg" -ForegroundColor Cyan
    Write-Host "─────────────────────────────────────────────" -ForegroundColor DarkGray
}

function Write-Ok($msg)   { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Info($msg) { Write-Host "  [..] $msg" -ForegroundColor Gray }
function Write-Req($label, $url) {
    Write-Host "  >>> $label" -ForegroundColor Yellow
    Write-Host "      $url" -ForegroundColor DarkYellow
}

# =============================================================================
# VERIFICACAO DE PRE-REQUISITOS
# Coloque os seus videos em:
#   demo\video-1.mp4
#   demo\video-2.mp4
# =============================================================================
$video1 = Join-Path $PSScriptRoot "demo\video-1.mp4"
$video2 = Join-Path $PSScriptRoot "demo\video-2.mp4"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Verificando pre-requisitos..." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$prereqOk = $true

# 1. Docker Desktop em execucao
try {
    $null = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "Docker Desktop em execucao"
    } else { throw }
} catch {
    Write-Host "  [ERRO] Docker Desktop nao esta em execucao. Inicie-o antes de continuar." -ForegroundColor Red
    $prereqOk = $false
}

# 2. Videos de demonstracao
if (Test-Path $video1) {
    $s1 = [math]::Round((Get-Item $video1).Length / 1MB, 1)
    Write-Ok "demo\video-1.mp4 encontrado ($s1 MB)"
} else {
    Write-Host "  [ERRO] demo\video-1.mp4 nao encontrado." -ForegroundColor Red
    Write-Host "         Copie um arquivo .mp4 para: $video1" -ForegroundColor Yellow
    $prereqOk = $false
}

if (Test-Path $video2) {
    $s2 = [math]::Round((Get-Item $video2).Length / 1MB, 1)
    Write-Ok "demo\video-2.mp4 encontrado ($s2 MB)"
} else {
    Write-Host "  [ERRO] demo\video-2.mp4 nao encontrado." -ForegroundColor Red
    Write-Host "         Copie um arquivo .mp4 para: $video2" -ForegroundColor Yellow
    $prereqOk = $false
}

if (-not $prereqOk) {
    Write-Host ""
    Write-Host "  Corrija os erros acima e execute o script novamente." -ForegroundColor Red
    exit 1
}
Write-Host ""

# =============================================================================
# REQUISITO: Containers (Docker Compose)
# =============================================================================
Write-Step 1 "Subindo toda a infraestrutura (Docker Compose)"
Write-Info "Inicia: API, Processor, Notification, PostgreSQL, Redis, LocalStack (S3+SQS), Prometheus, Grafana, MailHog"

docker compose up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Erro ao subir os containers. Verifique se o Docker esta em execucao." -ForegroundColor Red
    exit 1
}

Write-Info "Aguardando servicos ficarem saudaveis (pode levar ~30s)..."
$maxWait = 60
$waited  = 0
do {
    Start-Sleep -Seconds 5
    $waited += 5
    try {
        $h = Invoke-RestMethod "$API/health" -ErrorAction Stop
        if ($h.status -eq "ok") { break }
    } catch {}
    Write-Info "Aguardando... ($waited/$maxWait s)"
} while ($waited -lt $maxWait)

if ($waited -ge $maxWait) {
    Write-Host "  API nao respondeu a tempo. Verifique: docker compose logs api" -ForegroundColor Red
    exit 1
}
Write-Ok "Todos os servicos no ar!"

# =============================================================================
# REQUISITO: Sistema protegido por usuario e senha (JWT)
# =============================================================================
Write-Step 2 "Cadastro de usuario (autenticacao JWT)"

$email    = "demo@fiap.com.br"
$password = "Senha@123"

Write-Req "POST /auth/register" "$API/auth/register"
$register = Invoke-RestMethod -Method Post -Uri "$API/auth/register" `
    -ContentType "application/json" `
    -Body (ConvertTo-Json @{ name = "Demo FIAP"; email = $email; password = $password }) `
    -ErrorAction Stop

Write-Ok "Usuario criado: $($register.user.email)"

# =============================================================================
# REQUISITO: Autenticacao com usuario e senha
# =============================================================================
Write-Step 3 "Login — obtendo token JWT"

Write-Req "POST /auth/login" "$API/auth/login"
$login = Invoke-RestMethod -Method Post -Uri "$API/auth/login" `
    -ContentType "application/json" `
    -Body (ConvertTo-Json @{ email = $email; password = $password }) `
    -ErrorAction Stop

$token = $login.token
Write-Ok "Token JWT recebido (expira em 24h)"
Write-Info "Token: $($token.Substring(0,40))..."

$headers = @{ Authorization = "Bearer $token" }

# =============================================================================
# REQUISITO: Processar mais de um video ao mesmo tempo
#            Sistema nao perde requisicoes em picos (SQS + DLQ)
# =============================================================================
Write-Step 4 "Upload de DOIS videos simultaneos (demonstra concorrencia via SQS)"

$videoIds = @()

foreach ($i in 1..2) {
    $videoFile = if ($i -eq 1) { $video1 } else { $video2 }
    $videoName = Split-Path $videoFile -Leaf
    $videoMB   = [math]::Round((Get-Item $videoFile).Length / 1MB, 1)
    Write-Info "Video $i — $videoName ($videoMB MB)"
    Write-Info "Solicitando URL pre-assinada para video $i..."
    Write-Req "POST /videos/upload-url" "$API/videos/upload-url"

    $uploadResp = Invoke-RestMethod -Method Post -Uri "$API/videos/upload-url" `
        -Headers $headers `
        -ContentType "application/json" `
        -Body (ConvertTo-Json @{ filename = $videoName }) `
        -ErrorAction Stop

    $videoId  = $uploadResp.video.id
    $uploadUrl = $uploadResp.uploadUrl
    Write-Ok "Video $i — ID: $videoId"
    Write-Info "URL pre-assinada S3 gerada (expira em 15min)"

    # Faz upload direto para o S3 (LocalStack)
    Write-Info "Enviando arquivo para S3 via PUT..."
    $fileBytes = [System.IO.File]::ReadAllBytes($videoFile)
    Invoke-WebRequest -Method Put -Uri $uploadUrl `
        -Body $fileBytes `
        -ContentType "video/mp4" | Out-Null
    Write-Ok "Upload para S3 concluido"

    # Confirma o upload (dispara mensagem no SQS para o Processor)
    Write-Req "POST /videos/$videoId/confirm" "$API/videos/$videoId/confirm"
    $confirm = Invoke-RestMethod -Method Post -Uri "$API/videos/$videoId/confirm" `
        -Headers $headers `
        -ErrorAction Stop
    Write-Ok "Video $i confirmado — status: $($confirm.video.status) — mensagem enviada para SQS"

    $videoIds += $videoId
}

# =============================================================================
# REQUISITO: Listagem de status dos videos do usuario
# =============================================================================
Write-Step 5 "Listagem de status dos videos do usuario"

Write-Req "GET /videos" "$API/videos"
$list = Invoke-RestMethod -Method Get -Uri "$API/videos" -Headers $headers -ErrorAction Stop
Write-Ok "$($list.videos.Count) video(s) encontrado(s) para o usuario autenticado"
$list.videos | ForEach-Object {
    Write-Info "  ID: $($_.id) | arquivo: $($_.filename) | status: $($_.status)"
}

# =============================================================================
# REQUISITO: Consulta de status individual com polling
# =============================================================================
Write-Step 6 "Aguardando processamento assincrono (Processor consome SQS)"

$videoId = $videoIds[0]
Write-Info "Monitorando video ID: $videoId"
Write-Info "(Processor le a fila SQS e extrai frames do video)"

$maxPoll = 30
$polled  = 0
$status  = "pending"

while ($status -notin @("completed","failed") -and $polled -lt $maxPoll) {
    Start-Sleep -Seconds 3
    $polled += 3
    Write-Req "GET /videos/$videoId" "$API/videos/$videoId"
    $v = Invoke-RestMethod -Method Get -Uri "$API/videos/$videoId" -Headers $headers -ErrorAction Stop
    $status = $v.video.status
    Write-Info "Status: $status ($polled s)"
}

if ($status -eq "completed") {
    Write-Ok "Video processado com sucesso!"

    # =============================================================================
    # REQUISITO: Download do ZIP com os frames
    # =============================================================================
    Write-Step 7 "Obtendo URL de download do ZIP"
    Write-Req "GET /videos/$videoId/download-url" "$API/videos/$videoId/download-url"

    $dl = Invoke-RestMethod -Method Get -Uri "$API/videos/$videoId/download-url" `
        -Headers $headers -ErrorAction Stop
    Write-Ok "URL de download gerada: $($dl.downloadUrl.Substring(0,60))..."
} else {
    Write-Info "Video ainda em processamento (status: $status). O Processor esta rodando em background."
}

# =============================================================================
# REQUISITO: Notificacao em caso de erro (e-mail via MailHog)
# =============================================================================
Write-Step 8 "Notificacao por e-mail (MailHog)"
Write-Info "O servico Notification envia e-mails ao concluir ou falhar o processamento."
Write-Info "Acesse a caixa de entrada: http://localhost:8025"
Start-Process "http://localhost:8025"

# =============================================================================
# REQUISITO: Monitoramento (Prometheus + Grafana)
# =============================================================================
Write-Step 9 "Monitoramento — Prometheus + Grafana"
Write-Info "Prometheus coleta metricas da API em /metrics"
Write-Info "Grafana exibe dashboards em: http://localhost:3000  (admin / admin)"
Start-Process "http://localhost:3000"
Start-Process "http://localhost:9090"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Para encerrar:  docker compose down -v" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
