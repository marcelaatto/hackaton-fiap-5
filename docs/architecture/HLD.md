# HLD — High Level Design
## Sistema de Processamento de Vídeos · FIAP X

> **Versão:** 1.0  
> **Data:** Julho 2026  
> **Status:** Aprovado

---

## 1. Visão Geral

O **FIAP X Video Processor** é uma plataforma cloud-native de processamento assíncrono de vídeos. Usuários autenticados enviam vídeos via API REST, que são enfileirados para processamento em background: o vídeo é baixado do armazenamento em nuvem, frames são extraídos com FFmpeg, compactados em ZIP e disponibilizados para download. Em caso de falha, o usuário é notificado por e-mail.

### 1.1 Objetivos do Sistema

| Objetivo | Estratégia Adotada |
|----------|--------------------|
| Processar múltiplos vídeos simultaneamente | Arquitetura baseada em filas SQS + workers horizontalmente escaláveis |
| Não perder requisições em picos | SQS com DLQ e retry automático (até 3 tentativas) |
| Proteger acesso com usuário e senha | JWT com BCrypt para hash de senha |
| Listagem de status dos vídeos | Endpoint REST com polling; status persistido em PostgreSQL |
| Notificar erros ao usuário | Consumer SQS dedicado (Notification Service) + e-mail SMTP |
| Escalar conforme demanda | Containers stateless + SQS desacoplando produção/consumo |

---

## 2. Decisões Arquiteturais Principais

### ADR-001 — Microsserviços vs. Monolito
**Decisão:** Microsserviços  
**Contexto:** O sistema precisa escalar o processamento de vídeos independentemente da API.  
**Consequência:** 3 serviços independentes (api, processor, notification) com responsabilidades bem definidas. O processor pode ter múltiplas réplicas sem impactar a API.

### ADR-002 — SQS como Broker de Mensagens
**Decisão:** Amazon SQS  
**Contexto:** Requer resiliência a picos sem perda de mensagens.  
**Consequência:** Desacoplamento total entre publicação (API) e consumo (processor). Dead Letter Queue captura mensagens após 3 falhas.

### ADR-003 — Upload Direto ao S3 (Presigned URL)
**Decisão:** Cliente faz upload direto ao S3 via URL pré-assinada  
**Contexto:** Arquivos de vídeo podem ser grandes (>100MB). Trafegar pela API desperdiça banda e memória.  
**Consequência:** A API apenas gera a URL pré-assinada e registra o vídeo no banco. O upload ocorre diretamente entre cliente e S3.

### ADR-004 — PostgreSQL + Redis
**Decisão:** PostgreSQL para persistência, Redis para controle de concorrência  
**Contexto:** Dados relacionais entre usuários e vídeos; controle de limite de 3 vídeos simultâneos por usuário.  
**Consequência:** Redis como semáforo distribuído garante o controle mesmo com múltiplas réplicas da API.

### ADR-005 — Terraform para Infraestrutura como Código
**Decisão:** Terraform para provisionar recursos AWS  
**Contexto:** Reprodutibilidade do ambiente e versionamento da infraestrutura.  
**Consequência:** S3, SQS, IAM e ECR são criados/destruídos via `terraform apply`.

---

## 3. Arquitetura do Sistema

### 3.1 Fluxo Principal

```
┌──────────────┐
│    CLIENTE   │
│   (Browser/  │
│    Mobile)   │
└──────┬───────┘
       │ 1. POST /auth/login → JWT Token
       │ 2. POST /videos/upload-url → presigned URL + videoId
       │ 3. PUT {presignedUrl} (upload direto ao S3)
       │ 4. POST /videos/{id}/confirm
       │ 5. GET /videos (polling de status)
       │ 6. GET /videos/{id}/download-url → URL do ZIP
       ▼
┌──────────────────────────────────────────────────────────┐
│                     API SERVICE (:3001)                   │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │AuthController│  │VideoController│  │  Auth Middleware │ │
│  └──────┬──────┘  └──────┬───────┘  └─────────────────┘ │
│         │                │                                │
│  ┌──────▼──────┐  ┌──────▼───────┐                       │
│  │ AuthService │  │ VideoService │                        │
│  └──────┬──────┘  └──────┬───────┘                       │
│         │                │                                │
│  ┌──────▼──────┐  ┌──────▼───────────────────────────┐   │
│  │UserRepository│  │VideoRepository + S3Service +     │   │
│  └─────────────┘  │SQSPublisher + RedisClient         │   │
│                   └──────────────────────────────────-┘   │
└──────────────────────────────────────────────────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌─────────────┐    ┌────────────────┐    ┌────────────────┐
│  PostgreSQL  │    │   AWS S3       │    │   AWS SQS      │
│  (users,     │    │  hackaton-     │    │  video-jobs    │
│   videos)    │    │  videos /      │    │  video-failures│
└─────────────┘    │  hackaton-zips │    │  video-jobs-dlq│
                   └────────────────┘    └───────┬────────┘
                           ▲                     │
                           │                     ▼
                           │         ┌───────────────────────────┐
                           │         │     PROCESSOR SERVICE      │
                           │         │  (consumer SQS)            │
                           │         │  ┌─────────────────────┐  │
                           │         │  │  1. Download S3      │  │
                           │         │  │  2. FFmpeg frames    │  │
                           │         │  │  3. ZIP compactação  │  │
                           │         │  │  4. Upload ZIP → S3  │  │
                           │         │  │  5. Update COMPLETED │  │
                           │         │  └─────────────────────┘  │
                           │         └───────────────────────────┘
                           └─────────────────────────┘
                                           │ (falha após 3x)
                           ┌───────────────▼──────────────────────┐
                           │       NOTIFICATION SERVICE            │
                           │  (consumer video-failures)            │
                           │  Nodemailer → SMTP (SES / MailHog)   │
                           └──────────────────────────────────────┘
```

### 3.2 Máquina de Estados do Vídeo

```
                    ┌─────────┐
                    │ UPLOADED│ ◄── POST /videos/upload-url
                    └────┬────┘
                         │ POST /videos/{id}/confirm
                    ┌────▼────┐
                    │ QUEUED  │ ◄── publicado no SQS
                    └────┬────┘
                         │ consumer inicia
                    ┌────▼────────┐
                    │ PROCESSING  │
                    └────┬────────┘
               ┌─────────┴─────────┐
          (sucesso)             (falha 3x)
               │                   │
         ┌─────▼──────┐    ┌───────▼──────┐
         │ COMPLETED  │    │    FAILED    │
         └────────────┘    └──────────────┘
```

---

## 4. Componentes e Responsabilidades

### 4.1 API Service
- **Tecnologia:** Node.js + Express.js
- **Porta:** 3001
- **Responsabilidades:**
  - Autenticação (JWT + BCrypt)
  - Geração de presigned URLs para upload ao S3
  - Confirmação de upload e publicação no SQS
  - Listagem e consulta de status dos vídeos
  - Geração de presigned URLs para download do ZIP
  - Exposição de métricas Prometheus (`/metrics`)

### 4.2 Processor Service
- **Tecnologia:** Node.js + fluent-ffmpeg
- **Responsabilidades:**
  - Consumer do SQS `video-jobs`
  - Download do vídeo original do S3 para disco temporário
  - Extração de frames com FFmpeg (1 frame/segundo)
  - Compactação em ZIP (archiver)
  - Upload do ZIP para S3 `hackaton-zips`
  - Atualização de status no PostgreSQL
  - Publicação em `video-failures` após 3 tentativas falhas

### 4.3 Notification Service
- **Tecnologia:** Node.js + Nodemailer
- **Responsabilidades:**
  - Consumer do SQS `video-failures`
  - Envio de e-mail ao usuário informando a falha e o videoId

### 4.4 Infraestrutura de Dados

| Componente | Tecnologia | Papel |
|-----------|-----------|-------|
| Banco Relacional | PostgreSQL 15 | Persistência de usuários e vídeos |
| Cache/Semáforo | Redis 7 | Controle de concorrência (max 3 vídeos/usuário) |
| Object Storage | AWS S3 | Armazenamento de vídeos originais e ZIPs |
| Fila de Mensagens | AWS SQS | Desacoplamento API ↔ Processor |
| Dead Letter Queue | AWS SQS DLQ | Captura mensagens após 3 falhas |

---

## 5. Estratégia de Escalabilidade

### 5.1 Escalabilidade Horizontal

O design **stateless** dos microsserviços permite escala horizontal simples:

```
                    ┌─────────────────────────────┐
                    │        Load Balancer         │
                    └───────┬──────────┬──────────┘
                            │          │
                   ┌────────▼──┐  ┌────▼──────┐
                   │  API [1]  │  │  API [2]  │  ... réplicas N
                   └───────────┘  └───────────┘
                            │          │
                    ┌───────▼──────────▼────────┐
                    │           SQS             │
                    └───────────────────────────┘
                            │          │
               ┌────────────▼──┐  ┌────▼────────────┐
               │ Processor [1] │  │ Processor [2]   │  ... réplicas M
               └───────────────┘  └─────────────────┘
```

- **API** escala em número de réplicas conforme carga HTTP
- **Processor** escala para aumentar throughput de processamento de vídeos
- **SQS** atua como buffer, garantindo que nenhuma mensagem se perca durante picos

### 5.2 Limites Configuráveis

| Parâmetro | Valor Padrão | Variável de Ambiente |
|-----------|-------------|---------------------|
| Máx. vídeos simultâneos/usuário | 3 | `MAX_CONCURRENT_VIDEOS` |
| Timeout de processamento SQS | 5 min | `visibility_timeout` na fila |
| Retry máximo antes de FAILED | 3 | `maxReceiveCount` na DLQ |

---

## 6. Segurança

| Ameaça | Controle |
|--------|---------|
| Acesso não autorizado | JWT com expiração de 24h, validado em todo endpoint protegido |
| Senhas em texto claro | BCrypt com salt factor 12 |
| Acesso indevido a arquivos S3 | Presigned URLs com TTL de 5 min (upload) e 15 min (download) |
| Injeção de SQL | ORM Sequelize com queries parametrizadas |
| Upload de arquivos maliciosos | Validação de extensão + MIME type (.mp4 apenas) |
| Dados expostos em logs | Logs estruturados sem PII ou credenciais |
| Credenciais AWS | IAM Role com mínimo privilégio; sem credenciais hardcoded |

---

## 7. Monitoramento e Observabilidade

### 7.1 Stack de Observabilidade

```
┌─────────────────┐     scrape /metrics    ┌────────────┐
│   API Service   │ ─────────────────────► │ Prometheus │
│ (prom-client)   │                        │   :9090    │
└─────────────────┘                        └──────┬─────┘
                                                  │ datasource
                                           ┌──────▼─────┐
                                           │  Grafana   │
                                           │   :3000    │
                                           └────────────┘
```

### 7.2 Métricas Expostas
- HTTP request rate, latency (p50, p95, p99)
- Upload requests por status
- Fila SQS depth (via CloudWatch)
- Erros de processamento

### 7.3 Logs
- Logs estruturados (JSON) com `winston` via `@hackaton/shared`
- Campos padrão: `timestamp`, `level`, `service`, `message`, contexto da operação

---

## 8. Infraestrutura como Código

Todos os recursos AWS são provisionados via **Terraform** em `infrastructure/terraform/`:

| Arquivo | Recursos |
|---------|---------|
| `main.tf` | Provider AWS, backend config |
| `s3.tf` | Buckets `hackaton-videos` e `hackaton-zips` |
| `sqs.tf` | Filas `video-jobs`, `video-failures`, `video-jobs-dlq` |
| `iam.tf` | IAM Role + Policies (S3 + SQS) |
| `ecr.tf` | Repositórios ECR para imagens Docker |
| `variables.tf` | Variáveis configuráveis |
| `outputs.tf` | Outputs (URLs das filas, nome dos buckets) |

### Provisionar infraestrutura

```bash
cd infrastructure/terraform
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

---

## 9. Deploy e CI/CD

### 9.1 Pipeline CI (GitHub Actions — `ci.yml`)

```
push/PR → main
    └── Tests & Coverage
          ├── npm test (api + processor + notification)
          └── Upload coverage artifacts
              └── SonarCloud Analysis (apenas push main)
```

### 9.2 Pipeline CD (GitHub Actions — `cd.yml`)

```
push → main (após CI passar)
    └── Build & Push Docker Images
          ├── docker build api → ECR
          ├── docker build processor → ECR
          └── docker build notification → ECR
              └── Deploy to AWS ECS
                    ├── Update task definition api
                    ├── Update task definition processor
                    └── Update task definition notification
```

---

## 10. Ambiente Local de Desenvolvimento

```bash
# Sobe toda a stack
docker-compose up --build

# Serviços disponíveis:
# API:        http://localhost:3001
# Grafana:    http://localhost:3000 (admin/admin)
# Prometheus: http://localhost:9090
# MailHog:    http://localhost:8025
# LocalStack: http://localhost:4566
```

---

## 11. Decisões de Stack

| Tecnologia | Justificativa |
|-----------|--------------|
| Node.js 20 | Mesmo runtime em todos os serviços, ecossistema npm rico, não-bloqueante por natureza |
| Express.js | Minimalista e battle-tested para APIs REST |
| PostgreSQL 15 | ACID compliance, UUID nativo, excelente suporte via Sequelize |
| Redis 7 | Latência sub-milissegundo para controle de concorrência |
| AWS S3 | Armazenamento de objetos escalável e gerenciado; presigned URLs nativas |
| AWS SQS | Fila gerenciada com DLQ nativa, sem ops de broker |
| Docker Compose | Reprodutibilidade do ambiente local; mesma configuração de produção |
| Terraform | IaC declarativo, plano de execução auditável |
| Prometheus + Grafana | Stack de monitoramento open-source, integração nativa com Node.js |
| Jest + Supertest | Testes unitários, integração e BDD em um único runner |
