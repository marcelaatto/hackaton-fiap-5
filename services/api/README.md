# API Service — Hackaton FIAP X

Microsserviço responsável pela interface REST com o usuário: autenticação, gestão de vídeos, geração de URLs pré-assinadas e consulta de status.

---

## Responsabilidades

| Endpoint | Descrição |
|---|---|
| `POST /auth/register` | Cadastro de usuário |
| `POST /auth/login` | Login e geração de JWT |
| `POST /videos/upload-url` | Solicita URL pré-assinada para upload no S3 |
| `POST /videos/:id/confirm` | Confirma upload → grava no BD → publica no SQS |
| `GET /videos` | Lista vídeos do usuário autenticado |
| `GET /videos/:id` | Consulta status de um vídeo |
| `GET /videos/:id/download-url` | Gera URL pré-assinada para download do ZIP |
| `GET /health` | Health check |
| `GET /metrics` | Métricas Prometheus |

---

## Stack e Decisões Arquiteturais

### Node.js + Express
Escolhido por seu modelo de I/O não-bloqueante (event loop), ideal para uma API que lida com muitas requisições simultâneas sem bloquear threads. O Express é minimalista — não impõe estrutura, permitindo organizar o código com Clean Architecture.

### PostgreSQL + Sequelize ORM
O banco relacional garante consistência transacional para os metadados dos vídeos (especialmente a transição de status). O Sequelize foi escolhido por sua maturidade, suporte a migrations versionadas e compatibilidade com PostgreSQL em AWS RDS.

### JWT (JSON Web Tokens)
Autenticação stateless: o token carrega as informações do usuário sem necessidade de armazenar sessão no servidor. Isso permite que a API escale horizontalmente sem compartilhamento de estado.

### AWS S3 com Presigned URLs
O upload do vídeo vai **diretamente do cliente para o S3**, sem passar pela API. Isso elimina a API como gargalo para arquivos grandes (até 50 MB), evita timeouts e reduz o custo de tráfego.

### Redis (ioredis)
Usado para controle de concorrência: o contador de vídeos em processamento por usuário é mantido com operações atômicas (`INCR`/`DECR`). Mais simples e correto que usar locks no PostgreSQL.

### AWS SQS
A API apenas **publica** a mensagem na fila após confirmar o upload. O processamento real é assíncrono no Processor. Isso desacopla os serviços e garante que nenhuma requisição seja perdida em pico de carga.

### Joi (validação)
Validação de entrada declarativa nos controllers, antes de qualquer lógica de negócio.

### prom-client (Prometheus)
Expõe métricas HTTP padrão (latência, throughput, erros) no endpoint `/metrics` para coleta pelo Prometheus e visualização no Grafana.

---

## Estrutura de Pastas

```
src/
├── config/        → variáveis de ambiente e configuração do banco
├── controllers/   → recebe a requisição, chama o service, retorna resposta
├── services/      → regras de negócio
├── repositories/  → acesso ao banco de dados (Sequelize)
├── entities/      → models do Sequelize (User, Video)
├── middlewares/   → autenticação JWT, validação, error handler
├── routes/        → mapeamento de rotas para controllers
├── validators/    → schemas Joi de validação de entrada
├── errors/        → AppError para erros operacionais
├── infrastructure/
│   └── queue/     → publicação de mensagens no SQS
├── app.js         → configuração do Express
└── server.js      → entrypoint: conecta ao banco e sobe o servidor
```

---

## Como Executar Localmente

```bash
# Com Docker Compose (recomendado)
docker-compose up api

# Sem Docker (requer PostgreSQL, Redis e LocalStack rodando)
cp .env.example .env
npm run migrate
npm run dev
```
