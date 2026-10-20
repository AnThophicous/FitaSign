# Estado da validação

O FitaSign 0.1.0-beta.1 implementa projetos locais, canvas, camadas, inspetor, catálogo Roblox, histórico, preview, exportação Luau e MCP externo. A interface aprovada é escura e monocromática, com ícones arredondados.

## Verificado no Windows

- TypeScript, ESLint, verificação de dependências entre camadas e build de produção.
- 29 testes de domínio, persistência, concorrência, exportação, geometria e MCP stdio.
- 4 testes de integração na janela Electron: edição e histórico; drag/resize e preview; importação inválida; catálogo e propriedades nativas.
- Captura PNG real do artboard por MCP e exportação de arquivo Luau por diálogo.

O workflow repete os testes no Windows e no Ubuntu 24.04, empacota as distribuições e abre o executável empacotado. A prerelease depende do sucesso das duas plataformas. Os resultados públicos ficam em [GitHub Actions](https://github.com/AnThophicous/FitaSign/actions).

## Limites conhecidos

O preview HTML/CSS não substitui a validação no Roblox Studio. Consulte [o catálogo](roblox-catalog.md) para o suporte de renderização e os tipos exportados. Fontes remotas, assets Roblox, vídeo, cenas 3D e comportamentos avançados de layout são configurados para exportação, sem simulação completa no canvas.

A auditoria da árvore de desenvolvimento aponta oito avisos moderados na cadeia de download/empacotamento do Electron Builder, originados em sprintf-js. Não foi aplicado downgrade automático do empacotador. Não há certificado de assinatura Windows nem atualizador automático nesta beta.
