# Notification Service — Hackaton FIAP X

Worker responsável por consumir eventos de falha de processamento e notificar o usuário por e-mail.

---

## Responsabilidades

1. Consumir mensagens da fila SQS `video-failures`
2. Extrair informações do erro (usuário, vídeo, mensagem)
3. Enviar e-mail de notificação ao usuário afetado

---

## Stack e Decisões Arquiteturais

### Node.js (Worker puro)
Assim como o Processor, este serviço é um processo long-running sem servidor HTTP. Mantém um loop de polling na fila SQS de falhas.

### AWS SQS `video-failures`
Desacoplamento entre o Processor e o Notification. O Processor publica o evento de falha e não precisa saber quem vai tratar — pode ser e-mail, SMS, Slack, etc. O Notification Service é o único consumidor dessa fila.

### Nodemailer + MailHog
**MailHog** é um servidor SMTP fake usado em desenvolvimento. Captura todos os e-mails enviados e os exibe em uma interface web (`http://localhost:8025`). Para produção, basta trocar as credenciais SMTP sem alterar o código.

**Nodemailer** é a biblioteca Node.js padrão para envio de e-mails via SMTP. Simples, sem dependências externas.

### Por que não Amazon SES?
O AWS Academy Lab pode ter restrições de domínio verificado no SES. O MailHog + Nodemailer simula o comportamento corretamente em local e a troca para SES em produção é apenas configuração SMTP.

---

## Estrutura de Pastas

```
src/
├── config/         → variáveis de ambiente
├── consumers/      → consumer SQS (loop de polling)
├── services/
│   └── notificationService.js → lógica de envio de e-mail
├── infrastructure/
│   └── mailer/     → cliente Nodemailer configurado
└── worker.js       → entrypoint
```

---

## Como Executar Localmente

```bash
# Com Docker Compose (recomendado)
# Acesse os e-mails em http://localhost:8025
docker-compose up notification mailhog

# Sem Docker
cp .env.example .env
npm run dev
```
