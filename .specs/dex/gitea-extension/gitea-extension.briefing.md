# Extensão Gitea para VS Code

Nesse projeto, vamos criar facilitadores de uso para o Gitea. A princípio, nossos facilitadores serão exclusivos para a versão 1.14.7 do Gitea.

Vamos começar obtendo da internet a documentação da API dessa versão, e salvando em `doc/api`. Nós vamos usar esse documento como referência no restante do projeto.

Nossa stack principal será Node com TypeScript e POO. Nosso primeiro app será uma extensão para VS Code. A extensão precisa ter tradução para português do Brasil e inglês dos Estados Unidos, inclusive nos textos dos comandos e outros itens do manifesto.

Por enquanto, o primeiro e único comando da extensão será “Conectar servidor Gitea”, que vai pedir endereço do servidor, personal access token e validar a conexão.

Vamos usar Node 24 no desenvolvimento e em quaisquer pipelines que criarmos no futuro.
