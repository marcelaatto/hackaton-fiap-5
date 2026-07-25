const request = require('supertest');
const app = require('../../src/app');

// Mock completo da camada de serviço — testa apenas a camada HTTP
jest.mock('../../src/services/authService');
const authService = require('../../src/services/authService');

describe('Auth Routes', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('POST /auth/register', () => {
    it('deve retornar 201 com dados do usuário', async () => {
      authService.register.mockResolvedValue({
        id: 'uuid-1',
        name: 'João',
        email: 'joao@test.com',
      });

      const res = await request(app).post('/auth/register').send({
        name: 'João',
        email: 'joao@test.com',
        password: 'senha1234',
      });

      expect(res.status).toBe(201);
      expect(res.body.user).toHaveProperty('email', 'joao@test.com');
      expect(res.body.user).not.toHaveProperty('password_hash');
    });

    it('deve retornar 422 para campos inválidos', async () => {
      const res = await request(app).post('/auth/register').send({
        name: 'J', // muito curto
        email: 'email-invalido',
        password: '123', // muito curta
      });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('deve retornar 422 para body vazio', async () => {
      const res = await request(app).post('/auth/register').send({});
      expect(res.status).toBe(422);
    });

    it('deve retornar 409 se e-mail já existe', async () => {
      const { AppError } = require('@hackaton/shared');
      authService.register.mockRejectedValue(
        new AppError('E-mail já cadastrado', 409, 'EMAIL_ALREADY_EXISTS')
      );

      const res = await request(app).post('/auth/register').send({
        name: 'João',
        email: 'joao@test.com',
        password: 'senha1234',
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });
  });

  describe('POST /auth/login', () => {
    it('deve retornar 200 com token JWT', async () => {
      authService.login.mockResolvedValue({
        token: 'valid.jwt.token',
        user: { id: 'uuid-1', name: 'João', email: 'joao@test.com' },
      });

      const res = await request(app).post('/auth/login').send({
        email: 'joao@test.com',
        password: 'senha1234',
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token', 'valid.jwt.token');
      expect(res.body.user).toHaveProperty('email', 'joao@test.com');
    });

    it('deve retornar 401 para credenciais inválidas', async () => {
      const { AppError } = require('@hackaton/shared');
      authService.login.mockRejectedValue(
        new AppError('Credenciais inválidas', 401, 'INVALID_CREDENTIALS')
      );

      const res = await request(app).post('/auth/login').send({
        email: 'nao@existe.com',
        password: 'qualquer',
      });

      expect(res.status).toBe(401);
    });
  });
});
