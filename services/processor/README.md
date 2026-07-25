# Processor Service — Hackaton FIAP X

Worker assíncrono responsável por consumir vídeos da fila SQS, processá-los com FFmpeg, gerar um ZIP com os frames extraídos e disponibilizá-lo no S3.

---

## Responsabilidades

1. Consumir mensagens da fila SQS `video-jobs` (long polling)
2. Atualizar status do vídeo para `PROCESSING`
3. Baixar o vídeo original do S3
4. Extrair frames usando FFmpeg (1 frame/segundo)
5. Compactar frames em arquivo ZIP
6. Fazer upload do ZIP para o S3
7. Atualizar status para `COMPLETED`
8. Em caso de falha definitiva: publicar na fila `video-failures` e atualizar status para `FAILED`

---

## Stack e Decisões Arquiteturais

### Node.js (Worker puro, sem HTTP server)
O Processor é um processo long-running que fica em loop consumindo a fila. Não expõe endpoints HTTP — sua única interface é o SQS. O Node.js é adequado porque o processamento real é delegado ao FFmpeg (processo filho), não bloqueando o event loop.

### AWS SQS com Long Polling
O consumer usa `WaitTimeSeconds: 20` (long polling), que mantém a conexão aberta por até 20 segundos esperando mensagens. Isso reduz custo (menos chamadas à API do SQS) e latência vs. short polling.

### Dead Letter Queue (DLQ)
A fila `video-jobs` está configurada com `maxReceiveCount: 3`. Se o processamento falhar 3 vezes, a mensagem vai automaticamente para a DLQ. Isso previne mensagens "envenenadas" que travam o worker para sempre.

### Fila `video-failures` (separada da DLQ)
Quando o Processor detecta uma falha definitiva, ele publica uma mensagem com contexto do erro na fila `video-failures`. Isso é consumido pelo Notification Service para alertar o usuário. A DLQ é um mecanismo de infraestrutura; a fila de failures é um evento de negócio.

### FFmpeg (fluent-ffmpeg)
Wrapper Node.js para o FFmpeg. Extrai frames via `-vf fps=1` (1 frame por segundo). O FFmpeg é instalado via `apk add ffmpeg` no Dockerfile Alpine.

### archiver
Biblioteca para criação de ZIPs em streaming, evitando acumular todos os frames em memória antes de compactar.

### Sequelize (sem migrations)
O Processor acessa o banco de dados apenas para atualizar status de vídeos. As migrations são de responsabilidade exclusiva da API.

---

## Estrutura de Pastas

```
src/
├── config/         → variáveis de ambiente
├── consumers/      → consumer SQS (loop de polling)
├── services/
│   ├── processorService.js    → orquestra o fluxo completo
│   ├── frameExtractorService.js → FFmpeg wrapper
│   └── zipService.js          → compactação em ZIP
├── repositories/   → acesso ao banco (atualização de status)
├── infrastructure/
│   ├── queue/      → SQS consumer e publisher
│   ├── storage/    → S3 download/upload
│   └── ffmpeg/     → wrapper do fluent-ffmpeg
└── worker.js       → entrypoint
```

---

## Como Executar Localmente

```bash
# Com Docker Compose (recomendado)
docker-compose up processor

# Sem Docker (requer FFmpeg instalado no sistema)
cp .env.example .env
npm run dev
```
