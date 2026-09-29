# Especificação — Extensão Gitea para VS Code

## Objetivo e contexto

Oferecer facilitadores de uso do Gitea por meio de uma extensão para Visual Studio Code, inicialmente compatível com Gitea 1.14.7.

## Referências

- [Briefing](gitea-extension.briefing.md)
- [Contrato Swagger oficial para Gitea 1.14.7](https://github.com/go-gitea/gitea/blob/v1.14.7/public/swagger.v1.json) (referência online; não há cópia local).

## Escopo

### Incluído

- Extensão VS Code em Node.js e TypeScript.
- Localização em português do Brasil e inglês dos Estados Unidos para todo texto visível, incluindo manifesto, comandos e mensagens.
- Um comando, “Conectar servidor Gitea”, que solicita endereço e token de acesso pessoal, valida e armazena a conexão.
- Um servidor Gitea configurado por vez nesta etapa.
- Compatibilidade inicial direcionada ao Gitea 1.14.7.

### Excluído

- Outros comandos ou facilitadores.
- Gerenciamento simultâneo ou seleção entre múltiplos servidores.
- Suporte garantido a outras versões do Gitea.

## Requisitos funcionais

1. A extensão deve disponibilizar o comando localizado de conexão ao servidor Gitea.
2. O comando deve solicitar o endereço base do servidor e um token de acesso pessoal, ocultando o token durante a entrada.
3. A extensão deve validar o servidor chamando `GET /api/v1/user` com o token de acesso pessoal.
4. A conexão deve ser considerada válida somente quando a resposta HTTP for de sucesso e o corpo contiver um perfil de usuário parseável.
5. Após validação bem-sucedida, a extensão deve armazenar o token no `SecretStorage` do VS Code, associado ao servidor configurado.
6. A extensão deve permitir configurar um único servidor por vez; suporte a múltiplos servidores não faz parte desta etapa.
7. Todo texto visível da extensão deve possuir tradução `pt-br` e `en`.

## Regras de negócio

- A referência de compatibilidade inicial é Gitea 1.14.7.
- Credenciais inválidas ou falha de rede não devem ser salvas como conexão válida.
- Erros de rede e de autenticação devem exibir mensagens localizadas com causa geral e manter o usuário no fluxo para nova tentativa.

## Tratamento de erros

- Para indisponibilidade/rede, informar que não foi possível alcançar o servidor e permitir nova tentativa.
- Para resposta que indique falha de autenticação, informar que o token não foi aceito e permitir nova tentativa.
- Não armazenar token quando a validação falhar.

## Critérios de aceitação

- **CA-01:** A extensão apresenta um único comando para iniciar conexão ao servidor Gitea, com título em pt-BR e en-US.
- **CA-02:** Ao executar o comando, a interface solicita o endereço do servidor e token pessoal, com textos localizados e entrada do token mascarada.
- **CA-03:** A extensão faz `GET /api/v1/user` autenticado e só aceita resposta HTTP de sucesso com perfil parseável como conexão válida.
- **CA-04:** Após validação bem-sucedida, o token fica salvo pelo mecanismo `SecretStorage` associado ao endereço do servidor.
- **CA-05:** Erro de rede ou autenticação apresenta mensagem localizada, permite tentar novamente e não salva credenciais inválidas.
- **CA-06:** A extensão trabalha com um único servidor configurado nesta etapa.
- **CA-07:** Todos os textos visíveis da extensão e de seu manifesto possuem traduções pt-BR e en-US.
- **CA-08:** A documentação da API usada como referência corresponde ao Gitea 1.14.7.

## Testes esperados

- Verificar manifesto e catálogos para confirmar o único comando e a cobertura das duas localizações.
- Verificar entrada de endereço e token mascarado.
- Verificar sucesso de `GET /api/v1/user`, resposta não bem-sucedida, corpo inválido e falha de rede.
- Verificar persistência somente após validação e associação do segredo ao servidor configurado.
- Verificar que a tentativa de conexão pode ser repetida após falhas.

## Decisões técnicas

- Usar a infraestrutura de localização do VS Code e arquivos de bundle para pt-BR e en-US.
- Usar `SecretStorage` para persistir token de acesso pessoal.
- Usar `GET /api/v1/user` para validar credenciais e servidor.
- Desenvolver em Node.js 24 com TypeScript.
- O contrato Swagger 2.0 oficial da tag `v1.14.7` é a referência online de integração e deve ser consultado antes de implementar integrações com Gitea. Não se mantém cópia local.
