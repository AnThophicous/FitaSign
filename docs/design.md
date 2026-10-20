# Critérios de interface e escrita

A direção aprovada pelo usuário é totalmente escura e monocromática: grafite, cinza e branco acinzentado para leitura. Seleção, foco, botões, notificações e ícones seguem a mesma paleta. Interfaces Roblox criadas pelo usuário preservam liberdade de cor. A proposta inicial com painéis claros foi substituída por esta decisão.

Os anexos fornecem resumos das obras; não incluem seus textos integrais. As decisões abaixo aplicam esses resumos e fontes públicas dos autores/editoras. São critérios de projeto e avaliação, não comprovação de efeitos cerebrais.

| Referência                                                           | Decisão verificável                                                                                                                                 |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Don't Make Me Think, Steve Krug                                      | Fluxo projeto → canvas → exportação. Ações comuns com rótulos curtos, nos lugares esperados. Conferir o percurso sem orientação verbal.             |
| The Design of Everyday Things, Don Norman                            | Seleção visível, mapeamento direto ao arrastar, feedback do salvamento e desfazer. Ícones têm tooltip e nome acessível.                             |
| Design com Neurociências, Alex Soares                                | Espaçamento consistente, contraste controlado e movimento reduzido. Avaliar conforto com pessoas; a paleta sozinha não comprova estados emocionais. |
| Neurodesign: O Cérebro e a Máquina, José Guilherme Santa Rosa et al. | Canvas como foco; grupos estáveis no inspetor e revelação das propriedades da seleção.                                                              |
| Neuro Web Design, Susan Weinschenk                                   | Hierarquia de tamanho, proximidade e contraste para indicar o próximo passo; sem manipulação ou estímulos gratuitos.                                |
| Enviesados, Rian Dutra                                               | Uma ação principal por contexto, padrões familiares e confirmação antes de excluir um projeto.                                                      |
| Clean Code / Clean Architecture, Robert C. Martin                    | Nomes que expressem a regra, funções coesas, dependências para dentro e testes de invariantes do domínio.                                           |

As HIG são referência para hierarquia e consistência. O aplicativo usa convenções de Windows/Linux e não copia materiais exclusivos de plataformas Apple.

## Evitar conteúdo descartável

A definição de [slop no Merriam-Webster](https://www.merriam-webster.com/dictionary/slop) trata de conteúdo digital de baixa qualidade produzido em quantidade por IA. Para o FitaSign, isso vira uma revisão concreta:

- Remover frases que apenas elogiam o produto ou narram uma ação evidente.
- Um comentário explica uma decisão, limitação ou invariável. Não traduz o código para português e não recebe uma seção decorativa.
- Documentar comportamento existente. Não anunciar um recurso só porque um botão foi desenhado.
- Não inserir métricas fictícias, projetos recentes inventados, slogans, cartões decorativos ou status de agente simulados.
- Cores distinguem estados e agrupamentos. Gradientes pertencem ao design Roblox quando necessários; a moldura do editor permanece neutra.
- Testar criar, selecionar, editar, desfazer, reabrir e exportar. Uma captura bonita não comprova que o fluxo funciona.

## Fontes consultadas

- [Steve Krug — Don't Make Me Think](https://sensible.com/dont-make-me-think/)
- [Don Norman — Signifiers, not affordances](https://jnd.org/signifiers-not-affordances/)
- [Casa do Código — sumário de Design com Neurociências](https://www.casadocodigo.com.br/pages/sumario-design-neurociencias)
- [Apple — Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines)
- [Robert C. Martin — The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Electron — Security](https://www.electronjs.org/docs/latest/tutorial/security)

As imagens anexadas orientam superfícies, densidade, ícones e grid. Seus chats, marcas, onboarding e controles de publicação não definem o escopo do FitaSign.
