# Questionário de Refinamento — Extensão Gitea para VS Code

## Como responder

Responda abaixo de cada pergunta, mantendo a numeração. Respostas curtas são suficientes. Quando a sugestão estiver adequada, responda `manter sugestão`. Itens marcados como **Essencial** afetam diretamente a implementação.

### 1. Conexão ao servidor

#### 1.1 Persistência do token

**Essencial** — O token pessoal deve ser armazenado para conexões futuras? Isso afeta onde credenciais ficam guardadas e o fluxo após a validação.

Sugestão: armazenar o token no armazenamento seguro de segredos do VS Code (`SecretStorage`), associado ao servidor configurado.

Resposta: manter sugestão

#### 1.2 Número de servidores

**Essencial** — A extensão deve permitir configurar mais de um servidor Gitea?

Sugestão: permitir vários servidores, nomeando-os pelo endereço, e oferecer seleção quando houver mais de um.

Resposta: A princípio não há necessidade.

#### 1.3 Critério de validação

**Essencial** — Qual resposta da API confirma que o endereço e o token são válidos?

Sugestão: chamar `GET /api/v1/user`; considerar válida a conexão somente após resposta HTTP de sucesso e perfil do usuário parseável.

Resposta: manter sugestão

#### 1.4 Falha de conexão

Como deve ser tratado um erro de rede ou uma resposta de autenticação inválida?

Sugestão: exibir mensagem localizada com a causa geral e manter o usuário no fluxo para tentar novamente, sem salvar credenciais inválidas.

Resposta: manter sugestão
