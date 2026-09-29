# Instruções do projeto

- Manter `README.md` e `CHANGELOG.md` atualizados quando mudanças afetarem a documentação ou o histórico do projeto.
- Todos os textos visíveis da extensão VS Code, incluindo comandos, menus, mensagens, títulos, descrições e itens do manifesto, devem ter tradução em português do Brasil (`pt-br`) e inglês dos Estados Unidos (`en`). Não adicionar texto visível sem as duas traduções.
- Usar Node.js 24 no desenvolvimento e em quaisquer pipelines do projeto.
- Antes de implementar qualquer nova feature que integre com um servidor Gitea, consultar a documentação oficial da API correspondente à versão-alvo. Para o alvo inicial 1.14.7, a fonte versionada é https://github.com/go-gitea/gitea/blob/v1.14.7/public/swagger.v1.json; o local planejado para a cópia de referência é `doc/api/gitea-1.14.7.swagger.json`.
