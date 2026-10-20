import { defaultProperties, descendantsOf } from '../domain/document';
import type { DesignDocument, NodeProperties, NodeType } from '../domain/document';
import { validateDocument } from '../domain/validation';

export type Command =
  | {
      kind: 'add';
      id: string;
      parentId: string;
      type: Exclude<NodeType, 'ScreenGui'>;
      name: string;
      properties?: Partial<NodeProperties>;
    }
  | { kind: 'update'; id: string; name?: string; properties?: Partial<NodeProperties> }
  | { kind: 'remove'; id: string }
  | { kind: 'move'; id: string; parentId: string; index?: number }
  | { kind: 'rename'; name: string }
  | { kind: 'viewport'; width: number; height: number; background: string };

export function applyCommands(current: DesignDocument, commands: Command[]): DesignDocument {
  if (!Array.isArray(commands) || commands.length === 0 || commands.length > 500)
    throw new Error('Envie de 1 a 500 alterações.');
  const document = structuredClone(current);
  for (const command of commands) {
    for (const field of ['id', 'parentId'] as const) {
      if (
        field in command &&
        (!/^[a-zA-Z0-9_-]{1,100}$/.test(String(command[field as keyof typeof command])) ||
          ['__proto__', 'constructor', 'prototype'].includes(
            String(command[field as keyof typeof command]),
          ))
      )
        throw new Error('ID de camada inválido.');
    }
    switch (command.kind) {
      case 'rename':
        document.name = command.name;
        break;
      case 'viewport':
        document.viewport = {
          width: command.width,
          height: command.height,
          background: command.background,
        };
        break;
      case 'add': {
        if (['__proto__', 'constructor', 'prototype'].includes(command.id))
          throw new Error('ID de camada reservado.');
        const parent = document.nodes[command.parentId];
        if (!parent || Object.hasOwn(document.nodes, command.id))
          throw new Error('Pai inexistente ou ID repetido.');
        document.nodes[command.id] = {
          id: command.id,
          parentId: parent.id,
          children: [],
          type: command.type,
          name: command.name,
          properties: { ...defaultProperties(command.type), ...command.properties },
        };
        parent.children.push(command.id);
        break;
      }
      case 'update': {
        const node = document.nodes[command.id];
        if (!node) throw new Error('Camada não encontrada.');
        if (command.name !== undefined) node.name = command.name;
        if (command.properties) node.properties = { ...node.properties, ...command.properties };
        break;
      }
      case 'remove': {
        const node = document.nodes[command.id];
        if (!node?.parentId) throw new Error('A raiz não pode ser removida.');
        document.nodes[node.parentId]!.children = document.nodes[node.parentId]!.children.filter(
          (id) => id !== node.id,
        );
        for (const id of descendantsOf(document, node.id)) delete document.nodes[id];
        break;
      }
      case 'move': {
        const node = document.nodes[command.id];
        const parent = document.nodes[command.parentId];
        if (!node?.parentId || !parent || descendantsOf(document, node.id).includes(parent.id))
          throw new Error('Não é possível mover esta camada.');
        if (command.index !== undefined && (!Number.isInteger(command.index) || command.index < 0))
          throw new Error('Índice inválido.');
        const previous = document.nodes[node.parentId]!;
        previous.children = previous.children.filter((id) => id !== node.id);
        node.parentId = parent.id;
        parent.children.splice(command.index ?? parent.children.length, 0, node.id);
        break;
      }
      default:
        throw new Error('Alteração não reconhecida.');
    }
  }
  document.revision = current.revision + 1;
  validateDocument(document);
  return document;
}
