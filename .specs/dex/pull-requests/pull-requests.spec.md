# Especificação — Pull Requests

## Objetivo e contexto

Permitir consultar e criar Pull Requests do repositório Gitea associado ao workspace diretamente na extensão VS Code, usando o container de atividades **Gitea Classic Toolkit**.

## Referências

- [Briefing](pull-requests.briefing.md)
- [Questionário de refinamento](pull-requests.refinement-questionnaire.md)
- [Contrato Swagger oficial do Gitea 1.14.7](https://github.com/go-gitea/gitea/blob/v1.14.7/public/swagger.v1.json)

## Escopo

### Incluído

- Container de views com o nome localizado `Gitea Classic Toolkit`.
- View de árvore **Pull Requests**, com grupos **Aberto** e **Fechado**, botão de atualizar e botão para iniciar a criação.
- Até 20 PRs mais recentes por estado, considerando todos os PRs do repositório.
- Container de criação revelado e focado pelo comando de inclusão, com interface webview no painel de views e uma view com os arquivos alterados entre origem e base.
- Integração com o repositório Git aberto e o servidor Gitea já configurado.
- Localização pt-BR e en-US de todos os textos visíveis.

### Excluído

- Seleção entre múltiplos servidores Gitea.
- Criação de PR a partir de branches locais que não estejam publicadas no remoto associado.
- Inclusão no PR de alterações locais ainda não commitadas.

## Requisitos funcionais

1. A extensão deve identificar a raiz Git do workspace e extrair owner e repository a partir do remoto `origin`, aceitando formatos HTTPS e SSH.
2. A extensão deve usar o repositório identificado somente quando o host do remoto corresponder ao servidor configurado. Se o repositório não puder ser identificado ou não corresponder, deve informar o problema e não mostrar dados de outro repositório.
3. O container `Gitea Classic Toolkit` deve conter a view de árvore **Pull Requests**.
4. A árvore deve iniciar com os grupos **Aberto** e **Fechado**. Ao expandir um grupo, deve listar PRs do estado correspondente.
5. Cada grupo deve mostrar no máximo os 20 PRs mais recentes, ordenados pela data de criação decrescente.
6. O cabeçalho da view **Pull Requests** deve oferecer uma ação para atualizar os dados da árvore.
7. O cabeçalho deve oferecer uma ação para iniciar um novo PR.
8. A ação de inclusão deve exibir e focar um novo container dedicado à criação do PR.
9. A interface de criação deve ser uma `WebviewView` dentro desse novo container, no painel de views do VS Code. Não deve abrir arquivo, aba de editor ou painel de webview separado.
10. O formulário deve apresentar a branch base selecionada, a branch atual do workspace como origem, um campo de título, um campo de descrição e ações de cancelar e criar.
11. A branch base deve iniciar selecionada como a branch padrão do repositório. O usuário deve poder escolher outra branch existente.
12. A branch de origem deve ser a branch atual do workspace e deve estar publicada no remoto associado ao repositório para habilitar a criação.
13. A view de arquivos deve listar arquivos da diferença entre as branches remotas de origem e base, sem incluir alterações locais não commitadas.
14. Se houver alterações locais não commitadas, a extensão deve avisar que elas não serão incluídas e impedir a criação até que a árvore de trabalho esteja limpa.
15. O título é obrigatório e deve conter caracteres diferentes de espaços após trim. A descrição é opcional. Os limites de tamanho devem respeitar o contrato da API Gitea 1.14.7.
16. Ao cancelar, concluir a criação ou fechar a view de criação, o formulário não deve continuar sendo exibido. Fechar equivale a cancelar e descarta o conteúdo digitado.
17. Se a criação falhar por rejeição da API ou rede, a extensão deve apresentar mensagem localizada, manter o formulário e valores preenchidos e permitir nova tentativa.
18. Todos os textos visíveis, inclusive títulos de views, ações, grupos, mensagens e formulário, devem ter traduções pt-BR e en-US.

## Regras de negócio

- Um servidor Gitea é configurado por vez.
- A consulta é limitada ao repositório associado ao workspace atual.
- Cada grupo de estado limita seus resultados a 20 itens.
- O PR criado tem como head a branch atual publicada e como base uma branch existente do mesmo repositório.
- Mudanças não commitadas não pertencem ao PR; sua presença bloqueia a submissão até a árvore de trabalho ficar limpa.
- Encerrar o formulário por cancelar ou fechar não cria o PR.

## Tratamento de erros

- Falta de workspace Git, remoto `origin` inválido, owner/repository não identificável ou host divergente deve produzir mensagem localizada e impedir consulta/criação.
- Falha ao carregar PRs ou branches deve ser comunicada sem apresentar dados de outra origem; a ação de atualizar permite tentar novamente.
- Branch atual não publicada, branch base indisponível ou alterações locais não commitadas devem impedir a criação e explicar a condição.
- Título ausente ou inválido deve ser indicado no formulário sem descartar os demais valores.
- Rejeição da API ou falha de rede durante a criação deve manter o formulário aberto com seus valores para nova tentativa.

## Critérios de aceitação

- **CA-01:** O container localizado `Gitea Classic Toolkit` contém a árvore **Pull Requests** com os grupos **Aberto** e **Fechado**.
- **CA-02:** Expandir cada grupo carrega os PRs do estado correspondente, ordenados por criação decrescente e limitados a 20 por grupo.
- **CA-03:** A ação de atualizar recarrega os dados da árvore.
- **CA-04:** A ação de inclusão exibe e foca um container dedicado à criação; o formulário aparece nele como webview view, sem abrir arquivo, aba de editor ou painel de webview separado.
- **CA-05:** O formulário exibe base padrão selecionada e editável, branch atual como origem, título, descrição, cancelar e criar.
- **CA-06:** A view associada lista os arquivos da diferença das branches remotas de origem e base, sem incluir mudanças locais.
- **CA-07:** Sem remoto válido correspondente ao servidor, sem branch de origem publicada ou com alterações locais não commitadas, a extensão informa a condição e bloqueia a operação afetada.
- **CA-08:** Título é obrigatório; descrição é opcional; os limites da API Gitea 1.14.7 são respeitados.
- **CA-09:** Cancelar, criar com sucesso ou fechar a view encerra a exibição do formulário; fechar equivale a cancelar.
- **CA-10:** Falha na criação mantém formulário e valores, mostra erro localizado e permite tentar novamente.
- **CA-11:** Todo texto visível novo possui tradução pt-BR e en-US.

## Testes esperados

- Verificar extração de owner/repository de remotos HTTPS e SSH, host correspondente e cenários inválidos/divergentes.
- Verificar separação por estado, ordenação e limite de 20 resultados por grupo, bem como a atualização.
- Verificar metadados da view para confirmar que o formulário é uma webview view no container, sem abrir editor ou painel separado.
- Verificar branch padrão, seleção de base alternativa, branch atual e publicação no remoto.
- Verificar lista de arquivos por comparação das branches remotas e exclusão de mudanças locais.
- Verificar bloqueio diante de alterações não commitadas e validação de título/descrição.
- Verificar cancelamento, fechamento, criação bem-sucedida e falhas com preservação dos campos.
- Verificar cobertura de localização pt-BR e en-US em manifesto e bundles.

## Decisões técnicas

- Usar contribuições de `viewsContainers` e `views` do VS Code, uma `TreeView` para navegação de PRs e `WebviewViewProvider` para o formulário dentro do container dedicado à criação.
- O mecanismo específico para encerrar/ocultar a view de criação após concluir ou cancelar pode seguir as APIs disponíveis no VS Code, desde que o estado observável atenda aos requisitos e critérios acima.
- Consultar o Swagger oficial versionado do Gitea 1.14.7 antes de implementar chamadas de listagem, branches, arquivos de comparação e criação de PR.
- Usar Node.js 24 e TypeScript conforme as convenções do projeto.

## Pendências

- Nenhuma decisão essencial pendente no questionário.
- O Swagger versionado do Gitea 1.14.7 não pôde ser carregado neste ambiente (falhas de cache e DNS). Os endpoints e o payload usados precisam ser conferidos contra essa cópia antes de uma release.
- O VS Code permite controlar a visibilidade de views por contexto, mas containers contribuídos pelo manifesto são estáticos. A implementação esconde as views de criação após concluir/cancelar; o ícone do container dedicado continua visível enquanto a extensão estiver ativa.
