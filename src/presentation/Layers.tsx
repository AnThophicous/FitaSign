import { useState } from 'react';
import {
  CaretDownIcon,
  CaretRightIcon,
  CursorClickIcon,
  EyeIcon,
  EyeSlashIcon,
  ImageIcon,
  LockSimpleIcon,
  MonitorIcon,
  RectangleIcon,
  TextTIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@phosphor-icons/react';
import type { DesignDocument, DesignNode } from '../domain/document';
import type { Command } from '../application/commands';
import { childrenOf } from '../domain/document';
import { IconButton } from './components';

export function Layers({
  document,
  selectedId,
  select,
  commit,
  busy,
}: {
  document: DesignDocument;
  selectedId: string | null;
  select: (id: string) => void;
  commit: (commands: Command[]) => void;
  busy: boolean;
}) {
  const [collapsed, setCollapsed] = useState(new Set<string>());
  const [dragId, setDragId] = useState<string | null>(null);
  function row(node: DesignNode, depth: number) {
    const icons: Record<string, typeof RectangleIcon> = {
      ScreenGui: MonitorIcon,
      Frame: RectangleIcon,
      TextLabel: TextTIcon,
      TextButton: CursorClickIcon,
      ImageLabel: ImageIcon,
    };
    const Icon = icons[node.type] ?? RectangleIcon;
    const closed = collapsed.has(node.id);
    const hasChildren = node.children.length > 0;
    return (
      <div
        role="treeitem"
        aria-selected={selectedId === node.id}
        aria-expanded={hasChildren ? !closed : undefined}
        key={node.id}
      >
        <div
          className={`layer-row ${selectedId === node.id ? 'selected' : ''} ${!node.properties.visible ? 'hidden-layer' : ''}`}
          style={{ paddingLeft: 8 + depth * 14 }}
          draggable={node.type !== 'ScreenGui' && !busy}
          onDragStart={(event) => {
            setDragId(node.id);
            event.dataTransfer.setData('text/plain', node.id);
          }}
          onDragEnd={() => setDragId(null)}
          onDragOver={(event) => {
            if (dragId && dragId !== node.id) event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (dragId && dragId !== node.id)
              commit([{ kind: 'move', id: dragId, parentId: node.id }]);
            setDragId(null);
          }}
        >
          <button
            className="layer-collapse"
            aria-label={closed ? `Expandir ${node.name}` : `Recolher ${node.name}`}
            disabled={!hasChildren}
            onClick={() =>
              setCollapsed((current) => {
                const next = new Set(current);
                if (next.has(node.id)) next.delete(node.id);
                else next.add(node.id);
                return next;
              })
            }
          >
            {hasChildren ? closed ? <CaretRightIcon /> : <CaretDownIcon /> : null}
          </button>
          <button className="layer-select" onClick={() => select(node.id)}>
            <Icon size={16} />
            <span>{node.name}</span>
            {node.properties.locked && <LockSimpleIcon size={12} />}
          </button>
          {node.type !== 'ScreenGui' && (
            <IconButton
              className="layer-visibility"
              label={node.properties.visible ? `Ocultar ${node.name}` : `Mostrar ${node.name}`}
              disabled={busy}
              onClick={() =>
                commit([
                  {
                    kind: 'update',
                    id: node.id,
                    properties: { visible: !node.properties.visible },
                  },
                ])
              }
            >
              {node.properties.visible ? <EyeIcon size={14} /> : <EyeSlashIcon size={14} />}
            </IconButton>
          )}
        </div>
        {!closed && hasChildren && (
          <div role="group">
            {childrenOf(document, node.id).map((child) => row(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }
  function reorder(delta: number) {
    const node = selectedId ? document.nodes[selectedId] : undefined;
    if (!node?.parentId) return;
    const siblings = document.nodes[node.parentId]!.children;
    const index = siblings.indexOf(node.id);
    if (index + delta < 0 || index + delta >= siblings.length) return;
    commit([{ kind: 'move', id: node.id, parentId: node.parentId, index: index + delta }]);
  }
  return (
    <aside className="layers">
      <div className="panel-title">
        Camadas
        <div className="row">
          <IconButton
            label="Subir camada"
            disabled={busy || !selectedId || selectedId === document.rootId}
            onClick={() => reorder(-1)}
          >
            <ArrowUpIcon size={14} />
          </IconButton>
          <IconButton
            label="Descer camada"
            disabled={busy || !selectedId || selectedId === document.rootId}
            onClick={() => reorder(1)}
          >
            <ArrowDownIcon size={14} />
          </IconButton>
        </div>
      </div>
      <div className="layer-tree" role="tree" aria-label="Camadas">
        {row(document.nodes[document.rootId]!, 0)}
      </div>
      <footer className="layers-footer">
        {Object.keys(document.nodes).length - 1} camadas<span>Roblox UI</span>
      </footer>
    </aside>
  );
}
