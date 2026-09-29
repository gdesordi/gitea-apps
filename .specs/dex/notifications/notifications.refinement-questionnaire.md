# Questionário de Refinamento — Notifications

## Como responder

Responda abaixo de cada pergunta, mantendo a numeração. Respostas curtas são suficientes. Quando a sugestão estiver adequada, responda `manter sugestão`. Itens marcados como **Essencial** afetam diretamente a implementação.

### 1. Escopo e conteúdo

#### 1.1 Origem das notificações

**Essencial** — Quais notificações devem aparecer: as da conta autenticada em todo o servidor Gitea ou somente as relacionadas ao repositório do workspace atual?

Sugestão: listar notificações da conta autenticada em todo o servidor, como na view Notifications da extensão de referência.

Resposta: Listar notificações da conta autenticada em todo o servidor, como na view Notifications da extensão de referência.

#### 1.2 Estados e ordenação

**Essencial** — Quais estados devem ser exibidos e como ordenar as notificações?

Sugestão: exibir notificações não lidas e lidas ainda não concluídas, ordenadas da mais recente para a mais antiga; carregar mais itens sob demanda, sem limite total fixo.

Resposta: Exibir apenas notificações marcadas como não lidas. Na versão-alvo, considerar os estados lida e não lida; não exibir notificações lidas.

#### 1.3 Informações por item

**Essencial** — Quais informações uma notificação deve mostrar na árvore?

Sugestão: mostrar título do assunto, tipo (Issue ou Pull Request), repositório, autor e data da última atualização, com indicação visual de não lida.

Resposta: Mostrar título do assunto, tipo (Issue ou Pull Request), repositório, autor e data da última atualização, com indicação visual de não lida.

### 2. Ações e interação

#### 2.1 Ações por notificação

**Essencial** — Quais ações devem estar disponíveis em cada notificação?

Sugestão: abrir o assunto no navegador, marcar como lida e marcar como concluída, por menu de contexto e ações inline quando aplicável.

Resposta: Abrir o assunto no navegador e marcar como lida ou concluída, por menu de contexto e ações inline quando aplicável.

#### 2.2 Atualização da lista

Como a lista deve ser atualizada?

Sugestão: oferecer ação de atualizar no cabeçalho da view e carregar a primeira página novamente.

Resposta: Oferecer ação de atualizar no cabeçalho da view e carregar a primeira página novamente.

### 3. Conta e integração

#### 3.1 Requisitos de autenticação

**Essencial** — Como a view deve se comportar sem servidor conectado ou sem suporte da API da versão-alvo?

Sugestão: exigir a conexão já configurada na extensão; se Gitea 1.14.7 não oferecer o recurso ou a ação solicitada, informar indisponibilidade localizada e não simular sucesso.

Resposta: Exigir a conexão já configurada na extensão; se Gitea 1.14.7 não oferecer o recurso ou a ação solicitada, informar indisponibilidade localizada e não simular sucesso.
