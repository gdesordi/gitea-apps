# Questionário de Refinamento — Pull Requests

## Como responder

Responda abaixo de cada pergunta, mantendo a numeração. Respostas curtas são suficientes. Quando a sugestão estiver adequada, responda `manter sugestão`. Itens marcados como **Essencial** afetam diretamente a implementação.

### 1. Repositório e listagem

#### 1.1 Repositório-alvo

**Essencial** — Como a extensão deve identificar o repositório Gitea no qual listar e criar Pull Requests?

Sugestão: usar a raiz Git aberta no workspace e seus metadados de `origin`, reconhecendo URLs HTTPS e SSH do Gitea; se não for possível identificar owner/repository ou o remoto não corresponder ao servidor conectado, informar o problema e não exibir dados de outro repositório.

Resposta: manter sugestão

#### 1.2 Escopo e ordenação das listas

**Essencial** — Quais Pull Requests devem aparecer nas listas “Aberto” e “Fechado”, e o que define os 20 mais recentes?

Sugestão: listar todos os PRs do repositório em cada estado, ordenando pela data de criação mais recente e limitando cada grupo a 20 itens.

Resposta: manter sugestão

### 2. Criação de Pull Request

#### 2.1 Branch base

**Essencial** — Qual branch deve ser usada como base do novo PR, e o usuário pode alterá-la?

Sugestão: pré-selecionar a branch padrão do repositório e permitir escolher outra branch existente.

Resposta: manter sugestão

#### 2.2 Branch de origem

**Essencial** — Qual branch deve ser usada como origem do novo PR?

Sugestão: usar a branch atualmente aberta no workspace e permitir criar o PR somente quando ela estiver publicada no remoto associado ao repositório.

Resposta: manter sugestão

#### 2.3 Arquivos alterados

**Essencial** — Como determinar os arquivos que a view deve listar como alterados no PR?

Sugestão: mostrar os arquivos na diferença entre as branches remotas de origem e base, sem incluir mudanças locais não commitadas.

Resposta: manter sugestão

#### 2.4 Alterações locais não commitadas

**Essencial** — A criação deve ser permitida quando houver alterações locais não commitadas na branch de origem?

Sugestão: avisar que mudanças não commitadas não farão parte do PR e impedir a criação até que a árvore de trabalho esteja limpa.

Resposta: manter sugestão

#### 2.5 Validação do formulário

**Essencial** — Quais campos são obrigatórios e quais limites devem ser aplicados ao título e à descrição?

Sugestão: título obrigatório e não vazio após remover espaços; descrição opcional; aplicar os limites aceitos pela API da versão-alvo do Gitea.

Resposta: manter sugestão

### 3. Fluxo da view de criação

#### 3.1 Tipo e localização da interface de criação

**Essencial** — Como a interface de criação deve ser apresentada no VS Code?

Sugestão: apresentar o formulário como uma webview view pertencente ao container de criação de PR, dentro do painel de views do VS Code; não abrir arquivo, aba de editor nem painel de webview separado. O comando de inclusão deve revelar e focar esse container e sua view.

Resposta: apresentar como uma webview view dentro do novo container de criação de PR, no painel de views; não abrir arquivo, aba de editor ou painel separado.

#### 3.2 Fechamento da view

Como o botão de fechar da view deve se comportar enquanto o formulário está aberto?

Sugestão: fechar a view equivale a cancelar, descarta os dados digitados e não cria o PR.

Resposta: manter sugestão

#### 3.3 Falha ao criar

Como a extensão deve se comportar se a API rejeitar a criação ou houver falha de rede?

Sugestão: exibir uma mensagem localizada com a causa geral, manter o formulário e os valores preenchidos para correção ou nova tentativa, e manter a view aberta.

Resposta: Exibir uma mensagem localizada com a causa geral, manter o formulário e os valores preenchidos para correção ou nova tentativa, e manter a view aberta.
