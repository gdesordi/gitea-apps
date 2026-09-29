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

### 2. Navegação de Pull Requests

#### 2.1 Repositório-alvo

**Essencial** — Como a extensão deve identificar o repositório Gitea no qual listar e criar Pull Requests?

Sugestão: usar a raiz Git aberta no workspace e seus metadados de `origin`, reconhecendo URLs HTTPS e SSH do Gitea; caso não seja possível identificar owner/repository ou o remoto não corresponda ao servidor conectado, informar o problema e não exibir dados de outro repositório.

Resposta:

#### 2.2 Escopo das listas

**Essencial** — As listas “Aberto” e “Fechado” devem incluir Pull Requests de qual autoria/participação?

Sugestão: listar todos os PRs do repositório, abertos ou fechados conforme o grupo, ordenados pelos mais recentes e limitados a 20 em cada grupo.

Resposta:

#### 2.3 Base do novo Pull Request

**Essencial** — Qual branch deve ser usada como base, e como o usuário poderá alterá-la?

Sugestão: pré-selecionar a branch padrão do repositório e permitir escolher outra branch existente em um seletor da webview.

Resposta:

#### 2.4 Branch de origem

**Essencial** — Qual branch local deve ser enviada como branch de origem do novo PR?

Sugestão: usar a branch atualmente aberta no workspace; permitir criar o PR apenas se ela estiver publicada no remoto associado ao repositório.

Resposta:

#### 2.5 Alterações locais dos arquivos

**Essencial** — Como tratar arquivos modificados localmente que ainda não foram commitados ao criar o PR?

Sugestão: a lista de arquivos deve refletir as diferenças entre as branches remotas de origem e base, sem incluir mudanças não commitadas; avisar e impedir a criação enquanto houver alterações locais na branch de origem.

Resposta:

#### 2.6 Cancelamento e fechamento do formulário

Como tratar o botão de fechar da view de criação enquanto o formulário está aberto?

Sugestão: fechar a view equivale a cancelar; não criar o PR e descartar os dados digitados.

Resposta:
