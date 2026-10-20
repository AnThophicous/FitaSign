# MCP local

O FitaSign usa MCP stdio. Um processo por cliente encaminha operações para o aplicativo aberto. O token fica em um arquivo local, nunca na configuração do cliente ou no stdout.

Requer Node.js 24 ou superior. No código-fonte, execute `npm ci` e `npm run build` uma vez. Deixe o aplicativo aberto.

```json
{
  "mcpServers": {
    "fitasign": {
      "command": "node",
      "args": ["CAMINHO_ABSOLUTO/dist/mcp/stdio.cjs"]
    }
  }
}
```

Na distribuição instalada, use o arquivo `resources/mcp/stdio.cjs`. A área **Conexões** mostra o caminho exato. Essa estrutura serve como exemplo para clientes que usam `mcpServers`; outros clientes usam nomes e arquivos próprios. Configure `command` e `args` no formato esperado pelo seu agente. Não inclui chaves de provedores de IA.

`FITASIGN_CONNECTION_FILE` permite apontar para outro arquivo de conexão, útil quando `FITASIGN_DATA_DIR` foi definido. Não copie esse arquivo para o GitHub. Ele contém um token temporário.

## Ferramentas

| Ferramenta       | Resultado                                           |
| ---------------- | --------------------------------------------------- |
| `list_projects`  | IDs, nomes e datas locais                           |
| `create_project` | Novo projeto salvo                                  |
| `read_document`  | Árvore, revisão e disponibilidade de undo/redo      |
| `open_project`   | Abre o projeto no editor para inspeção e captura    |
| `apply_commands` | Lote validado e atômico                             |
| `undo` / `redo`  | Histórico do projeto                                |
| `export_luau`    | Texto do ModuleScript                               |
| `capture_canvas` | PNG do artboard ou camada visível do projeto aberto |

Recurso: `fitasign://schema` descreve propriedades e limites.

## Exemplo de edição

Depois de obter `projectId` e `revision` com `read_document`:

```json
{
  "projectId": "ID_DO_PROJETO",
  "expectedRevision": 0,
  "commands": [
    {
      "kind": "add",
      "id": "play-button",
      "parentId": "screen",
      "type": "TextButton",
      "name": "Jogar",
      "properties": {
        "position": { "xScale": 0.5, "xOffset": 0, "yScale": 0.7, "yOffset": 0 },
        "size": { "xScale": 0, "xOffset": 240, "yScale": 0, "yOffset": 56 },
        "anchor": { "x": 0.5, "y": 0.5 },
        "text": "Jogar",
        "fill": "#d8e4c5",
        "textColor": "#243b30",
        "corner": 8
      }
    }
  ]
}
```

Comandos: `add`, `update`, `remove`, `move`, `rename`, `viewport`. Em `update`, propriedades de primeiro nível são mescladas; objetos como `position`, `stroke` e `gradient` devem ser enviados completos. O resultado contém a nova revisão.

Para classes além das ferramentas básicas, consulte `search_catalog` com `className`. Envie propriedades específicas em `properties.native`, com seus nomes oficiais. O mapa `native` é substituído inteiro em um update; preserve os valores já lidos. [Tipos compostos e exemplos](roblox-catalog.md).

O manifesto está disponível em [AGENTS.md raw](https://raw.githubusercontent.com/AnThophicous/FitaSign/main/AGENTS.md). A [skill](../skills/fitasign-ui/SKILL.md) fica junto do código e pode ser instalada no diretório de skills do agente escolhido.

Não há ferramenta para executar código, ler caminhos livres ou excluir projetos. A captura é limitada ao conteúdo do FitaSign. Erros são retornados como `isError`, sem sucesso simulado.
