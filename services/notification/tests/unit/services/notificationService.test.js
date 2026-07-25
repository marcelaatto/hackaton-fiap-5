const notificationService = require('../../../src/services/notificationService');
const mailerClient = require('../../../src/infrastructure/mailer/mailerClient');

jest.mock('../../../src/infrastructure/mailer/mailerClient');

const PAYLOAD = {
  videoId: 'video-abc-123',
  userId: 'user-1',
  userEmail: 'joao@test.com',
  errorMessage: 'FFmpeg: codec not found',
};

describe('notificationService', () => {
  let mockSendMail;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendMail = jest.fn().mockResolvedValue({ messageId: 'smtp-msg-id-1' });
    mailerClient.createTransport.mockReturnValue({ sendMail: mockSendMail });
  });

  describe('sendFailureNotification', () => {
    it('deve enviar e-mail para o endereço correto', async () => {
      await notificationService.sendFailureNotification(PAYLOAD);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'joao@test.com' })
      );
    });

    it('deve incluir o videoId no subject ou no corpo do e-mail', async () => {
      await notificationService.sendFailureNotification(PAYLOAD);

      const args = mockSendMail.mock.calls[0][0];
      const conteudo = args.text + args.html;
      expect(conteudo).toContain('video-abc-123');
    });

    it('deve incluir a mensagem de erro no corpo do e-mail', async () => {
      await notificationService.sendFailureNotification(PAYLOAD);

      const args = mockSendMail.mock.calls[0][0];
      expect(args.text).toContain('FFmpeg: codec not found');
      expect(args.html).toContain('FFmpeg: codec not found');
    });

    it('deve usar o remetente configurado via env', async () => {
      await notificationService.sendFailureNotification(PAYLOAD);

      const args = mockSendMail.mock.calls[0][0];
      expect(args.from).toBeTruthy();
    });

    it('deve criar um novo transporter a cada chamada', async () => {
      await notificationService.sendFailureNotification(PAYLOAD);
      await notificationService.sendFailureNotification(PAYLOAD);

      expect(mailerClient.createTransport).toHaveBeenCalledTimes(2);
    });

    it('deve propagar erros do transporter para o chamador', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP connection refused'));

      await expect(
        notificationService.sendFailureNotification(PAYLOAD)
      ).rejects.toThrow('SMTP connection refused');
    });
  });
});
