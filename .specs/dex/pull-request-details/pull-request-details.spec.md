# Especificação — Detalhes do PR

## Objetivo e contexto

Permitir inspecionar commits e arquivos alterados de cada Pull Request aberto ou fechado diretamente na árvore da extensão, e abrir a comparação de um arquivo no editor do VS Code.

## Referências

- [Briefing](pull-request-details.briefing.md)
- [Questionário de refinamento](pull-request-details.refinement-questionnaire.md)
- [API Gitea 1.14.7](https://github.com/go-gitea/gitea/blob/v1.14.7/public/swagger.v1.json)

## Escopo

### Incluído

- Expandir qualquer PR listado nos grupos Aberto ou Fechado.
- Subgrupos expansíveis Arquivos e Commits.
- Exibir mensagem, autor e data em cada commit; seleção de commit não executa ação.
- Exibir caminho e status de cada arquivo, incluindo caminho anterior em renomeações.
- Abrir no diff nativo do VS Code as versões base e head do arquivo no PR, sem incorporar alterações locais.
- Ação inline por item de PR para abrir sua página no navegador.
- Localização de novos textos em pt-BR e en-US.

### Excluído

- Navegação para página de commit ao clicar num commit.
- Alterar a criação de PR já existente.

## Requisitos funcionais

1. Cada PR da listagem deve ser expansível independentemente de seu estado ser aberto ou fechado.
2. A expansão do PR deve apresentar os grupos expansíveis Arquivos e Commits.
3. A expansão de Commits deve carregar e listar os commits pertencentes ao PR, mostrando mensagem, autor e data.
4. A seleção de um commit não deve executar comando nem abrir outra interface.
5. A expansão de Arquivos deve carregar os arquivos alterados do PR e apresentar caminho e status (adicionado, modificado, removido ou renomeado), incluindo o caminho anterior se renomeado.
6. Selecionar um arquivo deve abrir o diff nativo do VS Code comparando o conteúdo desse arquivo na base e no head do PR. O diff deve usar conteúdo remoto do PR e não a cópia local de trabalho.
7. Em renomeações, a comparação deve usar o caminho anterior na base e o caminho atual no head.
8. Cada item de PR com URL disponível deve oferecer ação inline que abre a página correspondente no navegador. Selecionar ou expandir o item não deve abrir o navegador.
9. Falhas ao carregar commits, arquivos ou conteúdo de comparação devem ser comunicadas ao usuário sem invalidar as outras operações da árvore.
10. Todo texto visível introduzido deve ter tradução pt-BR e en-US.

## Regras de negócio

- Os detalhes pertencem ao número e ao repositório do PR selecionado.
- Conteúdo comparado corresponde aos SHAs de base e head retornados para o PR.
- A ação de abrir no navegador é explícita e independente da expansão do PR.

## Tratamento de erros

- Falhas de API ao carregar detalhes devem exibir mensagem localizada e permitir nova tentativa ao recolapsar e expandir novamente ou atualizar a árvore.
- Se algum lado do diff não puder ser obtido, informar a falha e não substituir o conteúdo por arquivos locais.
- Arquivo binário ou conteúdo que não possa ser representado como texto deve resultar em mensagem localizada e não abrir diff incorreto.
- Se o PR não fornecer URL, não exibir ação de navegador indisponível.

## Critérios de aceitação

- **CA-01:** PRs abertos e fechados podem ser expandidos e mostram Arquivos e Commits como grupos expansíveis.
- **CA-02:** Expandir Commits apresenta mensagem, autor e data dos commits do PR; clicar num commit não causa navegação ou comando.
- **CA-03:** Expandir Arquivos apresenta caminho e status; renomeações mostram também o caminho anterior.
- **CA-04:** Clicar num arquivo abre o diff nativo do VS Code entre base e head do PR, inclusive para renomeações, sem depender de mudanças locais.
- **CA-05:** A ação inline abre a página do PR no navegador, enquanto selecionar ou expandir a linha não a abre.
- **CA-06:** Erros de carregamento e de diff são comunicados, com traduções pt-BR e en-US.

## Testes esperados

- Conferir expansão nos grupos aberto e fechado, a hierarquia de nós e a ausência de ação em nós de commit.
- Conferir mapeamento de mensagens, autores, datas, caminhos e status, inclusive arquivos renomeados.
- Conferir a construção de URIs de diff remotas para base/head e comportamento em conteúdo ausente ou binário.
- Conferir a ação inline e a ausência de abertura automática ao selecionar/expandir PR.
- Conferir traduções dos textos visíveis novos.

## Decisões técnicas

- Usar endpoints Gitea versionados para commits e arquivos de um PR (`GET /repos/{owner}/{repo}/pulls/{index}/commits` e `/files`) e conteúdo versionado para materializar o diff remoto.
- Usar nós hierárquicos na `TreeDataProvider` existente e um `TextDocumentContentProvider` com esquema dedicado para apresentar o diff pelo comando `vscode.diff`.
- O Swagger versionado não foi obtido pelo ambiente durante este turno; confirmar o contrato de `/contents/{filepath}?ref={sha}` e os campos de resposta de arquivos contra a cópia oficial antes da publicação.
- Manter Node.js 24 e localizar todo texto da extensão em pt-BR e en-US.

## Pendências

- Conferência do Swagger oficial Gitea 1.14.7 ficou bloqueada por falha de carregamento/cache de rede; validar os contratos usados antes da publicação.
