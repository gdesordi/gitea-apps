# Facilitadores Gitea

Projeto para desenvolver facilitadores de uso do Gitea. O suporte inicial será direcionado ao Gitea 1.14.7.

## Estrutura

- `apps/extension`: extensão para Visual Studio Code.
- `doc/api`: links para a documentação online versionada da API do Gitea; o contrato não é copiado localmente.
- `.specs/dex`: briefings, refinamentos e especificações das features.

## Desenvolvimento

O projeto usa Node.js 24 e TypeScript. Consulte `AGENTS.md` para requisitos de contribuição, incluindo as traduções obrigatórias da extensão.

## Publicação da extensão

Para gerar uma versão, atualize o campo `version` em `apps/extension/package.json` e o lockfile, commit essas alterações e crie/envie uma tag no formato `vMAJOR.MINOR.PATCH` correspondente (por exemplo, `v0.0.2`). O GitHub Actions instala as dependências com Node.js 24, valida a correspondência da tag com a versão e gera o arquivo `gitea-vscode-extension-<versão>.vsix`, anexando-o à release da tag. A publicação no Marketplace do Visual Studio Code não está configurada.
