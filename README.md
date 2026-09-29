# Gitea Classic Toolkit

Projeto para desenvolver ferramentas que facilitam o uso do Gitea. O suporte inicial será direcionado ao Gitea 1.14.7.

## Estrutura

- `apps/extension`: extensão para Visual Studio Code.
- `doc/api`: links para a documentação online versionada da API do Gitea; o contrato não é copiado localmente.
- `.specs/dex`: briefings, refinamentos e especificações das features.

## Desenvolvimento

O projeto usa Node.js 24 e TypeScript. Consulte `AGENTS.md` para requisitos de contribuição, incluindo as traduções obrigatórias da extensão.

## Publicação da extensão

Para gerar uma versão, atualize o campo `version` em `apps/extension/package.json` e o lockfile, commit essas alterações e crie/envie uma tag no formato `vMAJOR.MINOR.PATCH` correspondente (por exemplo, `v0.0.2`). O GitHub Actions instala as dependências com Node.js 24, valida a correspondência da tag com a versão e gera o arquivo `gitea-vscode-extension-<versão>.vsix`, anexando-o à release da tag. A publicação no Marketplace do Visual Studio Code não está configurada.

## Recursos da extensão

- Conecte a extensão a um servidor Gitea com token pessoal.
- Consulte Pull Requests abertos e fechados do repositório Git do workspace.
- Crie Pull Requests a partir da branch atual publicada, selecione a base e confira os arquivos alterados.

A navegação do Gitea fica no container **Gitea Classic Toolkit**. O formulário de criação usa uma webview view do VS Code, fora do editor de arquivos.

Ao iniciar a criação de um Pull Request, a extensão abre o canal **Gitea Classic Toolkit** no painel Output, preservando o foco no formulário. O canal registra a resolução do repositório, chamadas e respostas da API, branches, arquivos comparados, bloqueios e erros. Título, descrição e token não são escritos no log.
