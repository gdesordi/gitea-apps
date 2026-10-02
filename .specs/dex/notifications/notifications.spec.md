# Especificação — Notifications

## Objetivo e contexto

Disponibilizar no VS Code uma view de notificações da conta autenticada no servidor Gitea configurado, seguindo a organização e interação da view Notifications do projeto de referência `Microsoft/vscode-pull-request-github`, adaptadas às capacidades do Gitea 1.14.7.

## Referências

- [Briefing](notifications.briefing.md)
- [Questionário de refinamento](notifications.refinement-questionnaire.md)
- [View Notifications do projeto de referência](https://github.com/microsoft/vscode-pull-request-github)
- [Contrato Swagger oficial do Gitea 1.14.7](https://github.com/go-gitea/gitea/blob/v1.14.7/public/swagger.v1.json)
- [Operações de notificações da API Gitea](https://docs.gitea.com/api/operations/notify-get-list/)

## Escopo

### Incluído

- Uma view de árvore **Notifications** no container `Gitea Classic Toolkit`.
- Consulta das notificações da conta autenticada para todo o servidor Gitea configurado, sem limitar ao repositório aberto no workspace.
- Exibição somente de notificações não lidas.
- Atualização manual pelo cabeçalho da view.
- Abertura do assunto da notificação no navegador.
- Ação para marcar a notificação como lida.
- Localização pt-BR e en-US de todo texto visível.

### Excluído

- Exibição de notificações lidas.
- Filtros por repositório, tipo, usuário ou prioridade.
- Ação “marcar como concluída” como estado separado de lida/não lida, a menos que o contrato da versão-alvo prove a existência desse estado.
- Configuração de ordenação e sincronização automática periódica.

## Requisitos funcionais

1. A extensão deve adicionar ao container `Gitea Classic Toolkit` uma view de árvore chamada **Notifications**.
2. A view deve consultar notificações da conta autenticada usando o servidor e token já configurados na extensão. A listagem deve ser global à conta no servidor, não limitada ao repositório do workspace.
3. A view deve apresentar somente notificações não lidas. Notificações lidas não devem ser exibidas.
4. Cada item deve apresentar título do assunto, tipo do assunto (Issue ou Pull Request), repositório, autor e data da última atualização, além de uma indicação visual de não lida, conforme os campos disponíveis no contrato da API.
5. Os itens devem ser ordenados da atualização mais recente para a mais antiga. A lista deve oferecer carregamento sob demanda de páginas adicionais, respeitando a paginação definida pela API.
6. O cabeçalho da view deve oferecer uma ação de atualizar, usando codicon da API do VS Code. Atualizar deve recarregar a primeira página e descartar páginas carregadas anteriormente.
7. Abrir um item deve abrir no navegador o endereço web do assunto relacionado, quando esse endereço estiver presente e válido.
8. Cada item deve oferecer uma ação para marcá-lo como lido, por menu de contexto e ação inline quando suportada pelo layout da view. Após sucesso, o item deve deixar a lista de não lidas.
9. A extensão deve usar somente conexões Gitea já validadas e armazenadas pelo fluxo de conexão existente. Sem conexão válida, deve orientar o usuário a conectar um servidor.
10. Todos os textos visíveis da view, comandos, menus e mensagens de estado ou erro devem possuir traduções pt-BR e en-US.

## Regras de negócio

- A view representa notificações da conta autenticada no servidor configurado e independe de qual repositório esteja aberto.
- O conjunto exibido contém apenas notificações não lidas, mesmo que a API permita listar outros estados.
- “Marcar como lida” remove a notificação do conjunto exibido quando a API confirma a alteração.
- Não há estado separado de “concluída” no comportamento aprovado. A interface não deve afirmar que marcou como concluída se a API apenas marca como lida.
- A ordenação é decrescente pela data de atualização disponibilizada pela API.

## Tratamento de erros

- Sem servidor/token configurado, a view deve mostrar estado vazio informativo e ação ou orientação para executar a conexão.
- Falha de rede, autenticação ou resposta inválida deve ser comunicada com mensagem localizada; a ação de atualizar deve permitir nova tentativa.
- Falha ao marcar como lida deve manter o item na lista e apresentar erro localizado.
- Se dados obrigatórios para abrir o assunto estiverem ausentes ou inválidos, a extensão deve informar que não pode abrir o assunto, sem tentar abrir URL arbitrária.
- Se a API não oferecer listagem ou atualização de leitura na versão-alvo, a extensão deve comunicar indisponibilidade da operação e não simular sucesso.

## Critérios de aceitação

- **CA-01:** A view **Notifications** aparece no container `Gitea Classic Toolkit` e possui títulos localizados em pt-BR e en-US.
- **CA-02:** A listagem usa a conta autenticada no servidor configurado e inclui notificações de repositórios diferentes do workspace atual.
- **CA-03:** A árvore exibe apenas notificações não lidas e mostra título, tipo, repositório, autor, atualização e estado visual quando esses dados são fornecidos pela API.
- **CA-04:** Os itens aparecem da atualização mais recente para a mais antiga e páginas adicionais podem ser carregadas sob demanda.
- **CA-05:** A ação de atualizar no cabeçalho recarrega a primeira página.
- **CA-06:** Abrir um item válido abre no navegador o assunto correspondente.
- **CA-07:** Marcar um item como lido chama a operação correspondente; em sucesso o item sai da lista, e em falha ele permanece visível com mensagem localizada.
- **CA-08:** Sem conexão ou diante de falha da API, a view apresenta estado/mensagem localizada e permite nova tentativa, sem exibir dados de outro servidor ou simular sucesso.
- **CA-09:** Todo texto visível novo tem tradução pt-BR e en-US.

## Testes esperados

- Verificar metadados do manifesto, identificador da view e traduções pt-BR/en-US.
- Verificar consulta global autenticada, filtro para não lidas, ordenação e paginação.
- Verificar campos apresentados quando opcionais estão ausentes ou malformados.
- Verificar atualização reiniciando a paginação.
- Verificar abertura de URLs válidas e rejeição de endereços ausentes ou inválidos.
- Verificar marcação como lida, remoção após sucesso e permanência do item após erro.
- Verificar ausência de conexão, falha de autenticação, falha de rede e resposta inválida.

## Decisões técnicas

- Implementar a view como `TreeView` usando contribuições de `views` no manifesto do VS Code.
- Reutilizar o serviço de conexão Gitea da extensão para endereço e token.
- Usar codicons da API VS Code nas ações do cabeçalho e dos itens; não criar SVG próprio para ações de view.
- Consultar o Swagger versionado do Gitea 1.14.7 para confirmar nomes dos parâmetros, formatos, campos de resposta, paginação e operação de marcação como lida antes da implementação.
- Desenvolver em Node.js 24 e TypeScript.

## Pendências

- O arquivo Swagger oficial na tag `v1.14.7` não pôde ser carregado neste ambiente (falha de cache). Embora a documentação atual e fontes históricas indiquem uma API de notificações com listagem e atualização de estado, os endpoints e contratos exatos da versão-alvo devem ser confirmados no arquivo versionado antes da implementação.
- A decisão “marcar como concluída” foi interpretada como ação sem suporte no modelo aprovado de dois estados (lida/não lida); somente marcar como lida está incluído até confirmação de estado separado na API 1.14.7.
