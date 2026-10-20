# Contribuir

Use Node 24 LTS. Instale com `npm ci`, execute `npm run dev` e leia `AGENTS.md` e `docs/architecture.md`.

Uma alteração deve resolver um comportamento concreto. Explique o problema, o resultado e a validação. Teste invariantes e fluxos observáveis; evite testes que apenas repetem a implementação.

Antes de enviar: `npm run format:check`, `npm run check` e `npm run test:e2e` quando houver mudança na interface. Para depurar fora do diretório de projetos reais, defina `FITASIGN_DATA_DIR`.

Não inclua projetos pessoais, tokens MCP, arquivos `.env`, builds ou dependências no commit. A licença das contribuições é Apache-2.0.
