Feature: Fluxo de upload de vídeo
  Como um usuário autenticado
  Quero fazer upload de um vídeo
  Para que os frames sejam extraídos e disponibilizados como ZIP

  Scenario: Fluxo completo de upload bem-sucedido
    Given que estou autenticado com email "usuario@teste.com"
    When solicito uma URL de upload para o arquivo "video.mp4"
    Then recebo uma URL pré-assinada do S3
    And o vídeo é registrado com status "UPLOADED"
    When informo que o upload foi concluído
    Then o status do vídeo muda para "QUEUED"

  Scenario: Tentativa de upload sem autenticação
    When solicito uma URL de upload sem estar autenticado
    Then recebo um erro 401

  Scenario: Upload com arquivo inválido (não MP4)
    Given que estou autenticado com email "usuario@teste.com"
    When solicito uma URL de upload para o arquivo "video.avi"
    Then recebo um erro 422 com mensagem "Formato não suportado. Use MP4."
