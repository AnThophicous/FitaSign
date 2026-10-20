---
name: fitasign-ui
description: Criar e ajustar interfaces Roblox em um documento FitaSign usando o MCP local, incluindo inspeção visual e exportação Luau. Use quando o alvo for um projeto aberto no FitaSign.
---

Abra o aplicativo FitaSign. Se as ferramentas não estiverem conectadas, consulte [a configuração MCP](../../docs/mcp.md). Não substitua o app por uma página HTML e não implemente um assistente interno.

Leia `fitasign://schema` e o documento do projeto. Use IDs estáveis nas camadas. Envie alterações relacionadas em um lote `apply_commands` com a revisão atual. Uma resposta de conflito exige reler e conciliar; não repita o mesmo lote cegamente.

Consulte `search_catalog` antes de usar classes ou propriedades adicionais. O catálogo cobre GuiObjects, layouts, constraints e modificadores. `properties.native` usa nomes oficiais e valores tipados. Ao atualizar esse mapa, preserve as propriedades existentes. O preview local não simula toda a API; [consulte os limites](../../docs/roblox-catalog.md).

Componha a interface de acordo com o jogo e a intenção do usuário. Um exemplo de menu não define a estética de todos os projetos. Use posição/tamanho UDim2, âncoras coerentes e o espaço do pai. Prefira escala para relações responsivas e offset para distâncias fixas. O preview tem viewport fixo; teste outros tamanhos antes de assumir responsividade.

Crie hierarquia com alinhamento, proximidade, contraste e tamanho. Use poucos grupos de ação. Textos de botões descrevem o resultado da ação. Gradientes, strokes e cantos devem servir ao estilo do jogo; não adicione decoração só para parecer refinado. Não alegue que uma cor produz um estado neurológico específico.

Confira o resultado com `capture_canvas`. O projeto precisa estar aberto no editor. Corrija sobreposição, recorte e leitura antes de exportar. O preview usa fontes locais e não baixa imagens Roblox; confirme fontes, assets, gradientes e tweens no Studio.

`export_luau` retorna um ModuleScript cuja função recebe a instância pai. A exportação cria a UI e tweens, mas não implementa ações dos botões. Preserve essa distinção ao entregar.
