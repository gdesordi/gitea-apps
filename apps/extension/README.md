# Gitea Classic Toolkit

Extensão do Visual Studio Code para acompanhar notificações da conta e Pull Requests do Gitea.

## O que você pode fazer

- Conectar a extensão a um servidor Gitea usando um token de acesso pessoal.
- Consultar notificações não lidas da conta Gitea, abrir os assuntos no navegador e marcá-las como lidas.
- Consultar Pull Requests abertos e fechados do repositório do workspace.
- Expandir Pull Requests para consultar commits e arquivos alterados e comparar arquivos no editor.
- Criar um Pull Request a partir da branch atual publicada, escolhendo a branch base e conferindo os arquivos alterados.

## Começar

1. Abra no VS Code um workspace com um repositório Git conectado ao Gitea.
2. Na Activity Bar, abra **Gitea Classic Toolkit** e execute **Connect to Gitea Server** (ou o comando equivalente traduzido).
3. Informe o endereço do servidor e um token de acesso pessoal válido.
4. Use a view **Notifications** para consultar notificações não lidas da conta e a view **Pull Requests** para consultar pedidos existentes ou iniciar a criação de um novo.

Para criar um Pull Request, publique a branch atual no remoto. A extensão informa e bloqueia a criação quando há alterações locais pendentes ou quando a branch atual não foi publicada. A branch base pode ser escolhida no formulário.

O token é armazenado no armazenamento seguro do VS Code. Os detalhes de diagnóstico ficam no canal **Gitea Classic Toolkit** do painel **Output**; título, descrição e token não são incluídos nesses logs.

## Requisitos

- Visual Studio Code 1.90 ou posterior.
- Um workspace com repositório Git e remoto compatível com Gitea.
- Endereço de um servidor Gitea e token de acesso pessoal válido.

Consulte o [changelog](CHANGELOG.md) para ver as alterações da extensão.
