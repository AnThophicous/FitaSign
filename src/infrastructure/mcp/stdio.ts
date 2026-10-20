import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { nodeTypes } from '../../domain/document';
import { robloxCatalog } from '../../domain/native';

const connectionFile =
  process.env.FITASIGN_CONNECTION_FILE ??
  join(
    process.platform === 'win32'
      ? (process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'))
      : (process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config')),
    'FitaSign',
    'mcp-connection.json',
  );
const clientId = randomUUID();
async function rpc(method: string, params: Record<string, unknown> = {}) {
  let connection: { url: string; token: string };
  try {
    connection = JSON.parse(await readFile(connectionFile, 'utf8'));
  } catch {
    throw new Error('Abra o FitaSign antes de conectar o agente.');
  }
  const url = new URL(connection.url);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.pathname !== '/rpc')
    throw new Error('Conexão local inválida.');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${connection.token}`,
      'Content-Type': 'application/json',
      'X-FitaSign-Client': clientId,
    },
    body: JSON.stringify({ method, params }),
    signal: AbortSignal.timeout(15000),
  });
  const payload = (await response.json()) as { result?: unknown; error?: string };
  if (!response.ok || payload.error)
    throw new Error(payload.error ?? 'Falha ao conectar ao FitaSign.');
  return payload.result;
}
const server = new McpServer({ name: 'fitasign', version: '0.1.0-beta.1' });
const projectId = z.string().min(1).max(100);
function result(value: unknown) {
  return {
    content: [
      { type: 'text' as const, text: typeof value === 'string' ? value : JSON.stringify(value) },
    ],
  };
}
function tool(
  name: string,
  description: string,
  inputSchema: Record<string, z.ZodType>,
  method: string,
  readonly = false,
) {
  server.registerTool(
    name,
    {
      description,
      inputSchema,
      annotations: {
        readOnlyHint: readonly,
        destructiveHint: false,
        idempotentHint: readonly,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        return result(await rpc(method, params));
      } catch (error) {
        return {
          ...result(error instanceof Error ? error.message : 'Falha no FitaSign.'),
          isError: true,
        };
      }
    },
  );
}
tool('list_projects', 'Lista os projetos locais do FitaSign.', {}, 'projects.list', true);
server.registerTool(
  'search_catalog',
  {
    description:
      'Consulta classes, propriedades e enums nativos suportados. Use className para obter o schema de uma classe antes de editar properties.native.',
    inputSchema: { query: z.string().optional(), className: z.string().optional() },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async ({ query, className }) => {
    if (className) {
      const entry = robloxCatalog.classes[className];
      if (!entry) return { ...result('Classe não encontrada.'), isError: true };
      const properties = Object.fromEntries(
        Object.entries(entry.properties)
          .filter(([name]) => name.toLowerCase().includes((query ?? '').toLowerCase()))
          .map(([name, definition]) => [
            name,
            {
              ...definition,
              ...(definition.enum ? { values: robloxCatalog.enums[definition.enum] } : {}),
            },
          ]),
      );
      return result({ className, visual: entry.visual, properties });
    }
    return result({
      version: robloxCatalog.version,
      classes: Object.keys(robloxCatalog.classes).filter((name) =>
        name.toLowerCase().includes((query ?? '').toLowerCase()),
      ),
    });
  },
);
tool(
  'create_project',
  'Cria e salva um projeto Roblox. Retorna o documento e sua revisão.',
  { name: z.string().min(1).max(120), example: z.boolean().optional() },
  'projects.create',
);
tool(
  'read_document',
  'Lê a árvore completa e revisão atual. Leia antes de editar.',
  { projectId },
  'document.read',
  true,
);
tool(
  'open_project',
  'Abre um projeto no editor para inspeção e captura visual.',
  { projectId },
  'document.open',
);
const vector = z.object({ x: z.number(), y: z.number() });
const unit = z.object({
  xScale: z.number(),
  xOffset: z.number(),
  yScale: z.number(),
  yOffset: z.number(),
});
const properties = z
  .object({
    native: z.record(z.string(), z.json()),
    position: unit,
    size: unit,
    anchor: vector,
    rotation: z.number(),
    fill: z.string(),
    transparency: z.number(),
    visible: z.boolean(),
    locked: z.boolean(),
    clip: z.boolean(),
    zIndex: z.number(),
    corner: z.number(),
    stroke: z
      .object({ color: z.string(), thickness: z.number(), transparency: z.number() })
      .nullable(),
    gradient: z.object({ from: z.string(), to: z.string(), rotation: z.number() }).nullable(),
    text: z.string(),
    textColor: z.string(),
    textSize: z.number(),
    font: z.enum(['Gotham', 'GothamMedium', 'GothamBold', 'SourceSans', 'Arial']),
    textAlign: z.enum(['Left', 'Center', 'Right']),
    textWrapped: z.boolean(),
    image: z.string(),
    imageFit: z.enum(['Fit', 'Crop', 'Stretch']),
    tween: z
      .object({
        duration: z.number(),
        delay: z.number(),
        easing: z.enum(['Quad', 'Sine', 'Cubic']),
        effect: z.enum(['Fade', 'SlideUp']),
      })
      .nullable(),
  })
  .partial()
  .strict();
const command = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('add'),
      id: z.string(),
      parentId: z.string(),
      type: z.enum(nodeTypes.filter((type) => type !== 'ScreenGui')),
      name: z.string(),
      properties: properties.optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('update'),
      id: z.string(),
      name: z.string().optional(),
      properties: properties.optional(),
    })
    .strict(),
  z.object({ kind: z.literal('remove'), id: z.string() }).strict(),
  z
    .object({
      kind: z.literal('move'),
      id: z.string(),
      parentId: z.string(),
      index: z.number().int().nonnegative().optional(),
    })
    .strict(),
  z.object({ kind: z.literal('rename'), name: z.string() }).strict(),
  z
    .object({
      kind: z.literal('viewport'),
      width: z.number(),
      height: z.number(),
      background: z.string(),
    })
    .strict(),
]);
tool(
  'apply_commands',
  'Aplica alterações em lote como uma única ação de desfazer. expectedRevision evita sobrescrever mudanças concorrentes. position/size usam UDim2; cores usam #RRGGBB. Leia a skill antes de compor layouts.',
  {
    projectId,
    expectedRevision: z.number().int().nonnegative(),
    commands: z.array(command).min(1).max(500),
  },
  'document.apply',
);
tool('undo', 'Desfaz a última alteração do projeto.', { projectId }, 'document.undo');
tool('redo', 'Refaz a última alteração desfeita.', { projectId }, 'document.redo');
tool(
  'export_luau',
  'Retorna um ModuleScript Luau com uma função que recebe o pai e retorna ScreenGui.',
  { projectId },
  'document.export',
  true,
);
server.registerTool(
  'capture_canvas',
  {
    description:
      'Captura o artboard do projeto aberto no editor. nodeId recorta uma camada visível. Não captura outras janelas.',
    inputSchema: { projectId, nodeId: z.string().optional() },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async (params) => {
    try {
      const data = await rpc('document.capture', params);
      return { content: [{ type: 'image', mimeType: 'image/png', data: String(data) }] };
    } catch (error) {
      return {
        ...result(error instanceof Error ? error.message : 'Falha na captura.'),
        isError: true,
      };
    }
  },
);
server.registerResource(
  'document-schema',
  'fitasign://schema',
  { description: 'Formato e limites do documento FitaSign.' },
  async () => ({
    contents: [
      {
        uri: 'fitasign://schema',
        mimeType: 'text/plain',
        text: 'FitaSign v1: ScreenGui único, filhos Frame/TextLabel/TextButton/ImageLabel. IDs únicos; parentId e children consistentes. UDim2={xScale,xOffset,yScale,yOffset}. anchor={x,y} entre 0 e 1. Cores #RRGGBB. transparency: 0 opaco, 1 invisível. Textos Gotham/Arial/SourceSans. Até 2000 camadas e 50 níveis. UICorner, UIStroke, UIGradient e TweenService são propriedades da camada. apply_commands é atômico e exige revisão. Capture apenas o projeto aberto. Sem execução arbitrária de código ou acesso a caminhos de arquivo via MCP.',
      },
    ],
  }),
);
void server.connect(new StdioServerTransport()).catch((error: unknown) => {
  process.stderr.write(String(error) + '\n');
  process.exitCode = 1;
});
