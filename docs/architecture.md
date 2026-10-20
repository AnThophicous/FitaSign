# Arquitetura

O domínio representa um documento de UI Roblox. Não importa React, Electron, Node, bibliotecas de protocolo ou disco. A aplicação usa esse modelo para editar, manter o histórico e gerar Luau. Os adaptadores executam as operações de sistema e apresentam o documento.

```text
presentation ───────► application ───────► domain
infrastructure ────► application ───────► domain
       └───────────────────────────────► domain
```

`scripts/check-boundaries.mjs` verifica a direção dos imports no lint. A [regra de dependência de Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) orienta essa separação.

- `src/domain`: árvore, propriedades, geometria e validação do formato v1.
- `src/application`: comandos puros, exportador, histórico e serviço de projetos. `ProjectRepository` é a porta de persistência.
- `src/infrastructure/storage`: JSON `.fitasign`, gravação em arquivo temporário e substituição por rename no mesmo diretório.
- `src/infrastructure/electron`: composição dos serviços, janela, protocolo local, IPC, diálogos e captura.
- `src/infrastructure/mcp`: servidor MCP stdio e ponte autenticada com o processo desktop.
- `src/presentation`: React, canvas e formulários. Usa a API limitada do preload.

## Edição e concorrência

Cada comando produz um novo documento validado. Um lote forma uma ação de desfazer. O histórico é limitado a 100 estados e 16.000 nós acumulados por projeto; não é persistido. A revisão é monotônica, inclusive ao desfazer. Agentes enviam a revisão lida; uma revisão antiga falha em vez de substituir silenciosamente uma edição.

O serviço serializa gravações. Prepara uma cópia da sessão e só publica o estado depois de salvar. Uma falha de disco preserva a sessão anterior. Fechar o aplicativo descarta apenas o histórico; documentos já confirmados estão no disco.

## Limites de processo

O renderer usa sandbox, isolamento de contexto e `nodeIntegration: false`. O preload expõe operações específicas e não expõe `ipcRenderer`. A origem e o frame de cada chamada são verificados. Não há navegação remota nem execução de scripts fornecidos pelo documento.

A ponte escuta apenas `127.0.0.1`, em porta dinâmica, com token por execução. Rejeita requisições com Origin, Host inesperado, token ausente e corpos acima de 2 MB. Não é uma API para acessar arquivos arbitrários nem executar Luau. O arquivo de conexão fica no diretório privado do usuário; no Windows herda a ACL desse diretório.

Projetos ficam em `%APPDATA%/FitaSign/projects` no Windows e `$XDG_CONFIG_HOME/FitaSign/projects` ou `~/.config/FitaSign/projects` no Linux. `FITASIGN_DATA_DIR` permite um diretório isolado para testes. O formato recusa versões futuras, ciclos, referências inválidas e mais de 2.000 camadas ou 50 níveis.

## Exportação

O exportador percorre a árvore em ordem. Usa identificadores próprios e escapa nomes e textos como strings Luau. Posição e tamanho preservam escala e offset de UDim2. UICorner, UIStroke, UIGradient e TweenService são emitidos como instâncias nativas. O projeto não contém código executável.

## Distribuição

Vite compila o renderer; esbuild compila os adaptadores. O servidor stdio é um único arquivo CommonJS com suas dependências e pode ser iniciado pelo Node 24, inclusive na instalação empacotada. Electron Builder gera NSIS/portable e AppImage/deb. O lockfile fixa a árvore instalada. GitHub Actions executa lint, build e testes antes de empacotar.
