import { childrenOf } from '../domain/document';
import type { DesignDocument } from '../domain/document';
import type { Command } from './commands';

export function duplicateCommands(
  document: DesignDocument,
  nodeId: string,
  newId: () => string,
): Command[] {
  const source = document.nodes[nodeId];
  if (!source?.parentId) throw new Error('Selecione uma camada para duplicar.');
  const commands: Command[] = [];
  function copy(id: string, parentId: string, root: boolean) {
    const node = document.nodes[id]!;
    const copiedId = newId();
    if (node.type === 'ScreenGui') return;
    const properties = structuredClone(node.properties);
    if (root)
      properties.position = {
        ...properties.position,
        xOffset: properties.position.xOffset + 24,
        yOffset: properties.position.yOffset + 24,
      };
    commands.push({
      kind: 'add',
      id: copiedId,
      parentId,
      type: node.type,
      name: root ? `${node.name} cópia` : node.name,
      properties,
    });
    for (const child of childrenOf(document, id)) copy(child.id, copiedId, false);
  }
  copy(source.id, source.parentId, true);
  return commands;
}
