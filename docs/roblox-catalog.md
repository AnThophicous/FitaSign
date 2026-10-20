# Catálogo Roblox

O catálogo é um snapshot da API pública do Roblox Studio, versão `version-4f087c32742644ab`. Os dados vêm do [CDN oficial](https://setup.rbxcdn.com/version-4f087c32742644ab-API-Dump.json), identificado pelo endpoint WindowsStudio64 do canal LIVE. O aplicativo não consulta essa API enquanto o usuário trabalha.

São 31 classes, 730 entradas de propriedades herdadas entre essas classes e 544 escolhas de enum associadas. Uma mesma propriedade pode existir em várias classes; esses números não representam milhares de funcionalidades independentes. O catálogo exclui propriedades ocultas, depreciadas, somente leitura e protegidas.

**Inserir** abre as classes e modificadores. No inspetor, **Roblox +** permite buscar propriedades nativas. Campos ausentes usam o padrão do Roblox. Remover uma propriedade restaura esse padrão na exportação. Os controles básicos de posição, tamanho e texto têm campos próprios para evitar valores duplicados.

Exemplos de classes: ScrollingFrame, TextBox, ImageButton, CanvasGroup, ViewportFrame, VideoFrame, UIListLayout, UIGridLayout, UIPageLayout, UIPadding, UIScale, UIAspectRatioConstraint, UISizeConstraint, UITextSizeConstraint, UIStroke, UIGradient, UIShadow, UIBlur, UIFlexItem e UIDragDetector.

Valores incluem booleanos, números, strings, referências a camadas, enums, Color3, UDim, UDim2, Vector2, Vector3, Rect, Font, ColorSequence e NumberSequence. Tipos compostos menos comuns são editados como JSON validado. Não há campo para executar código Luau.

## Preview e exportação

O exportador emite classes e propriedades nativas de todas as entradas do catálogo. A disponibilidade final depende da versão e dos recursos habilitados no Roblox Studio. O preview local tem suporte espacial aos elementos GuiObject, listas e grids simples, padding, cantos e bordas. Flex avançado, paginação, escala automática, sombras/blur nativos, vídeo, cenas 3D, fontes remotas, localização e input do jogo precisam de validação no Studio. O editor não simula esses comportamentos silenciosamente.

`properties.native` é um mapa de propriedades no nome oficial. Exemplo para uma UIListLayout:

```json
{
  "FillDirection": "Vertical",
  "SortOrder": "LayoutOrder",
  "Padding": { "scale": 0, "offset": 12 }
}
```

Agentes consultam `search_catalog` com `className` para obter tipos e valores válidos antes de editar. Atualização deliberada do snapshot:

```sh
node scripts/update-roblox-catalog.mjs
npm run format
npm run check
```

Confira a mudança no JSON e a compatibilidade com o Studio antes de atualizar a release.
