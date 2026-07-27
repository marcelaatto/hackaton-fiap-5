# Hackaton FIAP X — Sistema de Processamento de Vídeos

Plataforma de processamento assíncrono de vídeos. Usuários autenticados enviam vídeos via API, que são processados em background com FFmpeg para extração de frames compactados em ZIP.

---

## Arquitetura

```
                      ┌─────────────────────────────────┐
                      │         CLIENTE (REST)           │
                      └──────────────┬──────────────────┘
                                     │ JWT
                      ┌──────────────▼──────────────────┐
                      │          API SERVICE             │
                      │  :3001  Auth · Upload · Status   │
                      └──────┬───────────────┬───────────┘
                             │               │
                 ┌───────────▼──┐    ┌───────▼──────────┐
                 │  PostgreSQL  │    │    AWS S3         │
                 │  users       │    │  hackaton-videos  │
                 │  videos      │    │  hackaton-zips    │
                 └──────────────┘    └──────────────────┘
                                              ▲
                      ┌───────────────────────┴──────────┐
                      │           AWS SQS                 │
                      │  video-jobs ──► video-jobs-dlq   │
                      │  video-failures                   │
                      └──────────┬───────────────────────┘
                                 │
                 ┌───────────────▼─────────────────────────┐
                 │          PROCESSOR SERVICE               │
                 │  FFmpeg · Frames · ZIP · S3 Upload       │
                 └──────────────────────────────────────────┘
                                 │ (publica em video-failures)
                 ┌───────────────▼─────────────────────────┐
                 │        NOTIFICATION SERVICE              │
                 │  Nodemailer · MailHog                    │
                 └──────────────────────────────────────────┘
```

**Redis** — controle de concorrência (máx. 3 vídeos simultâneos por usuário)
**Prometheus + Grafana** — monitoramento e métricas

---

## Microsserviços

| Serviço | Porta | Responsabilidade |
|---|---|---|
| `api` | 3001 | Autenticação, upload, status, download |
| `processor` | — | Consumer SQS, FFmpeg, ZIP, S3 |
| `notification` | — | Consumer SQS de falhas, envio de e-mail |

---

## Infraestrutura Local

| Serviço | Porta | Descrição |
|---|---|---|
| PostgreSQL | 5432 | Banco de dados relacional |
| Redis | 6379 | Cache e controle de concorrência |
| LocalStack | 4566 | Simulador de S3 e SQS da AWS |
| MailHog SMTP | 1025 | Servidor de e-mail fake |
| MailHog UI | 8025 | Interface web dos e-mails |
| Prometheus | 9090 | Coleta de métricas |
| Grafana | 3000 | Dashboard de métricas (admin/admin) |

---

## Como Executar

### Pré-requisitos
- Docker e Docker Compose
- Node.js 20+ (para desenvolvimento sem Docker)

### Subir toda a stack

```bash
# 1. Clone o repositório
git clone <repo-url>
cd hackaton-fiap-5

# 2. Copie o arquivo de variáveis de ambiente
cp .env.example .env

# 3. Suba todos os serviços
docker-compose up --build

# A API estará disponível em: http://localhost:3001
# MailHog UI:                 http://localhost:8025
# Grafana:                    http://localhost:3000 (admin/admin)
# Prometheus:                 http://localhost:9090
```

### Desenvolvimento local (sem Docker para os serviços Node)

```bash
# Instalar dependências do monorepo
npm install

# Subir apenas a infraestrutura
docker-compose up postgres redis localstack mailhog prometheus grafana

# Rodar cada serviço em terminais separados
npm run api
npm run processor
npm run notification
```

---

## Fluxo da Aplicação

```
1.  POST /auth/login          → JWT token
2.  POST /videos/upload-url   → Presigned URL do S3
3.  PUT  <presigned-url>      → Upload direto para S3
4.  POST /videos/:id/confirm  → API grava metadados + publica no SQS
5.  Processor consome SQS     → Baixa vídeo → FFmpeg → ZIP → S3
6.  GET  /videos/:id          → Consulta status
7.  GET  /videos/:id/download-url → Presigned URL para download do ZIP
```

---

## Status dos Vídeos

`UPLOADED` → `QUEUED` → `PROCESSING` → `COMPLETED`  
                                      ↘ `FAILED`

---

## Testes

```bash
# Todos os serviços
npm test

# Por serviço
npm run test:api
npm run test:processor
npm run test:notification
```

---

## Documentação da Arquitetura

| Documento | Descrição |
|-----------|-----------|
| [HLD — High Level Design](docs/architecture/HLD.md) | Visão geral, decisões arquiteturais, componentes, segurança e escalabilidade |
| [C4 Model](docs/architecture/C4.md) | Diagramas de Contexto, Container, Componentes e Sequência |

---

## Infraestrutura AWS (Produção)

```bash
cd infrastructure/terraform
terraform init
terraform plan
terraform apply
```

Recursos criados: S3 (2 buckets), SQS (3 filas + DLQ), referência ao `LabRole` e ECR (3 repositórios).

---

## CI/CD

Pipeline unificado em `.github/workflows/ci-cd.yml` com três estágios em sequência:

```
push / PR → main
     │
     ▼
┌─────────────────────────┐
│  1 · Tests & Coverage   │  unit · integration · BDD (api, processor, notification)
│     + upload artifacts  │  PostgreSQL · Redis · LocalStack (S3+SQS) via services
└────────────┬────────────┘
             │ needs: test
             ▼
┌─────────────────────────┐
│  2 · SonarCloud         │  quality gate · cobertura · code smells
│     Analysis            │  (executa em push E em PRs)
└────────────┬────────────┘
             │ needs: test + sonar   (apenas push em main)
             ▼
┌─────────────────────────┐
│  3 · Deploy to AWS      │  terraform apply → ECR build & push (api · processor · notification)
└─────────────────────────┘
```

### Secrets necessários no repositório GitHub

| Secret | Descrição |
|--------|-----------|
| `AWS_ACCESS_KEY_ID` | Chave de acesso AWS Lab |
| `AWS_SECRET_ACCESS_KEY` | Chave secreta AWS Lab |
| `AWS_SESSION_TOKEN` | Token de sessão AWS Lab |
| `SONAR_TOKEN` | Token do SonarCloud (Settings → Security → Generate Token) |

---

## Projeto Base

O projeto Go original apresentado aos investidores está preservado em [`legacy/`](legacy/).
