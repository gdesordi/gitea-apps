# Changelog

Este projeto segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

## [Não publicado]

### Adicionado

- Adicionados detalhes expansíveis de commits e arquivos em cada Pull Request, comparação de arquivos no editor e ação inline para abrir o PR no navegador.
- Adicionada uma view de notificações não lidas com paginação, atualização, abertura do assunto e ação para marcar como lida.

### Modificado

- Ajustado o ícone Git do container Gitea Classic Toolkit para a Activity Bar do VS Code.

## [0.0.2] - 2026-09

### Adicionado

- Adicionadas views para listar e criar Pull Requests, incluindo seleção da branch base e lista de arquivos alterados.
- Adicionado o canal Output `Gitea Classic Toolkit` com logs do fluxo de criação de Pull Requests.
- Substituídos os SVGs dos botões do header por ícones de produto do VS Code.
- Corrigido o fluxo de foco e espera da view de criação de Pull Request, com diagnóstico persistente quando o VS Code não a resolve.
- Removida a dependência de um comando de foco de view que não é registrado pelo VS Code.
- Declarado o tipo webview na view de criação de Pull Request para o VS Code resolver o provider correto.

- Workflow do GitHub Actions para empacotar a extensão em VSIX e anexá-la à release ao enviar uma tag de versão.
- Script de empacotamento da extensão usando `@vscode/vsce`.

- Estrutura inicial da documentação do projeto e da extensão VS Code.
- Refinados e consolidados os requisitos da conexão da extensão Gitea para VS Code.
- Registrada a fonte versionada da API Gitea 1.14.7 e a regra de consulta antes de integrações.

### Modificado

- Definida a documentação online oficial como referência da API, sem pendência de cópia local.
- Renomeada a extensão para Gitea Classic Toolkit.
