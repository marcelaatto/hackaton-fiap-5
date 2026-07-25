const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authService = require('../../../src/services/authService');
const userRepository = require('../../../src/repositories/userRepository');
const AppError = require('../../../src/errors/AppError');

jest.mock('../../../src/repositories/userRepository');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('authService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('deve criar usuário com sucesso', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashed_pwd');
      userRepository.create.mockResolvedValue({
        id: 'uuid-1',
        name: 'João',
        email: 'joao@test.com',
      });

      const result = await authService.register({
        name: 'João',
        email: 'joao@test.com',
        password: 'senha1234',
      });

      expect(result).toEqual({ id: 'uuid-1', name: 'João', email: 'joao@test.com' });
      expect(bcrypt.hash).toHaveBeenCalledWith('senha1234', 12);
      expect(userRepository.create).toHaveBeenCalledWith({
        name: 'João',
        email: 'joao@test.com',
        password_hash: 'hashed_pwd',
      });
    });

    it('deve lançar 409 se e-mail já cadastrado', async () => {
      userRepository.findByEmail.mockResolvedValue({ id: 'existing' });

      await expect(
        authService.register({ name: 'João', email: 'joao@test.com', password: 'senha1234' })
      ).rejects.toMatchObject({ statusCode: 409, code: 'EMAIL_ALREADY_EXISTS' });
    });
  });

  describe('login', () => {
    it('deve retornar token para credenciais válidas', async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: 'uuid-1',
        name: 'João',
        email: 'joao@test.com',
        password_hash: 'hashed_pwd',
      });
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('valid.jwt.token');

      const result = await authService.login({
        email: 'joao@test.com',
        password: 'senha1234',
      });

      expect(result.token).toBe('valid.jwt.token');
      expect(result.user).toEqual({ id: 'uuid-1', name: 'João', email: 'joao@test.com' });
    });

    it('deve lançar 401 se usuário não encontrado', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'nao@existe.com', password: 'senha1234' })
      ).rejects.toMatchObject({ statusCode: 401, code: 'INVALID_CREDENTIALS' });
    });

    it('deve lançar 401 se senha incorreta', async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: 'uuid-1',
        email: 'joao@test.com',
        password_hash: 'hashed_pwd',
      });
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        authService.login({ email: 'joao@test.com', password: 'senha_errada' })
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('não deve revelar se o e-mail existe em erros de login', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      bcrypt.compare.mockResolvedValue(false);

      let err1;
      try {
        await authService.login({ email: 'nao@existe.com', password: 'qualquer' });
      } catch (e) {
        err1 = e;
      }

      userRepository.findByEmail.mockResolvedValue({ id: 'u1', password_hash: 'h' });
      let err2;
      try {
        await authService.login({ email: 'existe@test.com', password: 'errada' });
      } catch (e) {
        err2 = e;
      }

      // Ambos os erros devem ter a mesma mensagem (não revelar se e-mail existe)
      expect(err1.message).toBe(err2.message);
    });
  });
});
