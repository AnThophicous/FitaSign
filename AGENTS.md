# FitaSign

Editor de UI Roblox para Windows e Linux. O nome é **FitaSign**. TypeScript, Electron, React. Apache-2.0. Agentes executam fora do aplicativo, via MCP.

## Trabalhar no código

Leia `docs/architecture.md` antes de mudar limites entre camadas. Domínio não importa frameworks, Node ou adaptadores. Aplicação depende do domínio e de portas próprias. Disco, Electron, MCP e React ficam nos adaptadores. Faça a regra simples primeiro; não crie classes ou interfaces sem um consumidor concreto.

Execute `npm run check` e os testes de interação relevantes antes de entregar. O build vem antes de `npm run test:e2e`. Compile Windows no Windows e Linux no Linux. Não declare uma plataforma testada com base só em um arquivo de configuração.

Comentários explicam por que uma decisão existe ou qual limitação permanece. Prefira nomes claros a comentários que descrevem a próxima linha. Documentação deve distinguir suporte existente de trabalho futuro. Não esconda erros com sucesso vazio nem enfraqueça validação para passar um teste.

## Criar interfaces pelo MCP

Leia `skills/fitasign-ui/SKILL.md` e `docs/mcp.md`. Consulte `fitasign://schema`, use `list_projects`, leia o documento e envie `apply_commands` com `expectedRevision`. Um lote é uma ação de desfazer. Se houver conflito, leia novamente; preserve alterações alheias.

Use ScreenGui como raiz. Consulte `search_catalog` para classes, propriedades e enums. Os controles básicos ficam em `properties`; campos específicos usam `properties.native`. UICorner, UIStroke e UIGradient também podem ser instâncias explícitas. Leia `docs/roblox-catalog.md` para distinguir preview de exportação. Não insira Luau arbitrário ou chamadas ao sistema nos documentos.

Confira escala, offset, âncora, hierarquia, alinhamento, contraste e legibilidade. Capture o canvas antes de declarar o resultado visual pronto. A captura comprova o preview; valide fontes e comportamento final no Roblox Studio. Não prometa fidelidade de pixel entre HTML e Roblox.

## Interface do editor

Aplique `docs/design.md`. Use convenções familiares e rótulos curtos. Dê nome acessível e tooltip aos ícones. Preserve foco visível e operação por teclado. Agrupe propriedades pela tarefa e esconda campos que não se aplicam à seleção.

As referências visuais não autorizam copiar seus recursos. Não crie chat de IA, lista de modelos, créditos, onboarding, colaboração, nuvem ou publicação. MCP e configuração de agentes pertencem à área de conexões.
