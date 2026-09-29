# Instruções do projeto

- Manter o `apps/extension/README.md` atualizado quando mudanças na extensão alterarem informações de uso, configuração, recursos ou requisitos importantes para seus usuários. O README da raiz continua documentando o projeto como um todo.
- Registrar em `apps/extension/CHANGELOG.md` apenas mudanças na extensão com impacto para usuários, como funcionalidades, correções, ajustes de interface ou alterações operacionais relevantes; omitir decisões internas de implementação, convenções do repositório e documentação voltada apenas a contribuidores.
- No changelog da extensão, seguir Keep a Changelog e usar datas de versões publicadas exclusivamente no formato mensal `YYYY-MM` (por exemplo, `2026-09`), sem dia. Não reescrever o histórico existente ao ajustar o formato; aplicar a regra às novas entradas e às entradas editadas.
- Todos os textos visíveis da extensão VS Code, incluindo comandos, menus, mensagens, títulos, descrições e itens do manifesto, devem ter tradução em português do Brasil (`pt-br`) e inglês dos Estados Unidos (`en`). Não adicionar texto visível sem as duas traduções.
- Os botões no header das views devem usar ícones de produto/codicons da API do VS Code (por exemplo, `$(refresh)` e `$(add)`), sem criar ícones SVG próprios para essas ações.
- Usar Node.js 24 no desenvolvimento e em quaisquer pipelines do projeto.
- Usar https://github.com/Microsoft/vscode-pull-request-github como projeto de referência para decisões de implementação da extensão. Quando houver dúvidas, consultar como esse projeto resolve o caso e considerar sugerir a mesma abordagem.
- Antes de implementar qualquer nova feature que integre com um servidor Gitea, consultar a documentação oficial da API correspondente à versão-alvo. Para o alvo inicial 1.14.7, a fonte versionada é https://github.com/go-gitea/gitea/blob/v1.14.7/public/swagger.v1.json; o local planejado para a cópia de referência é `doc/api/gitea-1.14.7.swagger.json`.
