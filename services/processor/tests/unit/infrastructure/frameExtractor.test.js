// jest.mock é hoisted antes das declarações — não referenciar variáveis externas na factory
jest.mock('fluent-ffmpeg');

const ffmpeg = require('fluent-ffmpeg');
const frameExtractor = require('../../../src/infrastructure/ffmpeg/frameExtractor');

describe('frameExtractor', () => {
  let mockInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Recria o mock instance para cada teste com controle total dos eventos
    mockInstance = {
      outputOptions: jest.fn().mockReturnThis(),
      output: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
      run: jest.fn(),
    };

    ffmpeg.mockReturnValue(mockInstance);
  });

  it('deve resolver a Promise quando FFmpeg emite "end"', async () => {
    mockInstance.on.mockImplementation((event, cb) => {
      if (event === 'end') setImmediate(cb);
      return mockInstance;
    });

    await expect(
      frameExtractor.extractFrames('/tmp/video.mp4', '/tmp/frames')
    ).resolves.toBeDefined();
  });

  it('deve rejeitar a Promise quando FFmpeg emite "error"', async () => {
    mockInstance.on.mockImplementation((event, cb) => {
      if (event === 'error') setImmediate(() => cb(new Error('FFmpeg binário não encontrado')));
      return mockInstance;
    });

    await expect(
      frameExtractor.extractFrames('/tmp/video.mp4', '/tmp/frames')
    ).rejects.toThrow('FFmpeg falhou');
  });

  it('deve chamar run() para iniciar o processamento', async () => {
    mockInstance.on.mockImplementation((event, cb) => {
      if (event === 'end') setImmediate(cb);
      return mockInstance;
    });

    await frameExtractor.extractFrames('/tmp/video.mp4', '/tmp/frames');

    expect(mockInstance.run).toHaveBeenCalled();
  });
});
