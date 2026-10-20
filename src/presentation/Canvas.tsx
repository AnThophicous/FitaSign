import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent, WheelEvent } from 'react';
import {
  CornersOutIcon,
  CursorIcon,
  HandIcon,
  ImageIcon,
  MinusIcon,
  PlusIcon,
  RectangleIcon,
  TextTIcon,
  CursorClickIcon,
} from '@phosphor-icons/react';
import { nodeBounds } from '../domain/document';
import type { DesignDocument, DesignNode, NodeProperties } from '../domain/document';
import type { Command } from '../application/commands';
import { IconButton } from './components';
import { Scene } from './Scene';

interface Gesture {
  x: number;
  y: number;
  pan: { x: number; y: number };
  node?: DesignNode;
  document: DesignDocument;
  resize?: string;
  angle: number;
  bounds: { width: number; height: number };
  moved: boolean;
}

export function Canvas({
  document,
  selectedId,
  select,
  commit,
  add,
  preview,
  busy,
}: {
  document: DesignDocument;
  selectedId: string | null;
  select: (id: string | null) => void;
  commit: (commands: Command[], revision?: number) => Promise<void>;
  add: (type: 'Frame' | 'TextLabel' | 'TextButton' | 'ImageLabel') => void;
  preview: boolean;
  busy: boolean;
}) {
  const area = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [zoom, setZoom] = useState(0.5);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hand, setHand] = useState(false);
  const space = useRef(false);
  const [transient, setTransient] = useState<DesignDocument | null>(null);
  const transientRef = useRef<DesignDocument | null>(null);
  function fit() {
    const bounds = area.current?.getBoundingClientRect();
    if (!bounds) return;
    setZoom(
      Math.min(
        1,
        Math.max(
          0.05,
          Math.min(
            (bounds.width - 128) / document.viewport.width,
            (bounds.height - 180) / document.viewport.height,
          ),
        ),
      ),
    );
    setPan({ x: 0, y: 0 });
  }
  useEffect(() => {
    fit();
  }, [document.id, document.viewport.width, document.viewport.height]);
  useEffect(() => {
    function down(event: KeyboardEvent) {
      if (
        event.code === 'Space' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement).tagName)
      ) {
        event.preventDefault();
        space.current = true;
      }
    }
    function up() {
      space.current = false;
    }
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', up);
    };
  }, []);
  function parentMetrics(node: DesignNode) {
    const lineage: DesignNode[] = [];
    let parent = node.parentId ? document.nodes[node.parentId] : undefined;
    while (parent && parent.type !== 'ScreenGui') {
      lineage.unshift(parent);
      parent = parent.parentId ? document.nodes[parent.parentId] : undefined;
    }
    let size = { width: document.viewport.width, height: document.viewport.height };
    let angle = 0;
    for (const item of lineage) {
      size = nodeBounds(item.properties, size);
      angle += item.properties.rotation;
    }
    return { size, angle };
  }
  function start(event: PointerEvent, node?: DesignNode, resize?: string) {
    if (preview || busy || (event.button !== 0 && event.button !== 1)) return;
    const panning = hand || space.current || event.button === 1;
    event.preventDefault();
    event.stopPropagation();
    const target = panning ? undefined : node;
    if (!panning) select(target?.id ?? null);
    const metrics = target ? parentMetrics(target) : { angle: 0, size: document.viewport };
    gesture.current = {
      x: event.clientX,
      y: event.clientY,
      pan,
      node: target,
      document,
      resize,
      angle: metrics.angle,
      bounds: target ? nodeBounds(target.properties, metrics.size) : metrics.size,
      moved: false,
    };
    if (!target && !panning) {
      gesture.current = null;
      return;
    }
    area.current?.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent) {
    const active = gesture.current;
    if (!active) return;
    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;
    if (Math.abs(dx) + Math.abs(dy) < 2 && !active.moved) return;
    active.moved = true;
    if (!active.node) {
      setPan({ x: active.pan.x + dx, y: active.pan.y + dy });
      return;
    }
    const p = active.node.properties;
    const radians = (-(active.angle + (active.resize ? p.rotation : 0)) * Math.PI) / 180;
    const localX = (dx * Math.cos(radians) - dy * Math.sin(radians)) / zoom;
    const localY = (dx * Math.sin(radians) + dy * Math.cos(radians)) / zoom;
    let properties: NodeProperties;
    if (active.resize) {
      const west = active.resize.includes('w');
      const north = active.resize.includes('n');
      const width = Math.max(1, active.bounds.width + localX * (west ? -1 : 1));
      const height = Math.max(1, active.bounds.height + localY * (north ? -1 : 1));
      const dw = width - active.bounds.width;
      const dh = height - active.bounds.height;
      const cx = dw * (west ? -0.5 : 0.5);
      const cy = dh * (north ? -0.5 : 0.5);
      const rotation = (p.rotation * Math.PI) / 180;
      properties = {
        ...p,
        size: {
          ...p.size,
          xOffset: Math.round(p.size.xOffset + dw),
          yOffset: Math.round(p.size.yOffset + dh),
        },
        position: {
          ...p.position,
          xOffset: Math.round(
            p.position.xOffset +
              cx * Math.cos(rotation) -
              cy * Math.sin(rotation) +
              (p.anchor.x - 0.5) * dw,
          ),
          yOffset: Math.round(
            p.position.yOffset +
              cx * Math.sin(rotation) +
              cy * Math.cos(rotation) +
              (p.anchor.y - 0.5) * dh,
          ),
        },
      };
    } else {
      const snap = event.shiftKey ? 8 : 1;
      properties = {
        ...p,
        position: {
          ...p.position,
          xOffset: Math.round((p.position.xOffset + localX) / snap) * snap,
          yOffset: Math.round((p.position.yOffset + localY) / snap) * snap,
        },
      };
    }
    const next = {
      ...active.document,
      nodes: { ...active.document.nodes, [active.node.id]: { ...active.node, properties } },
    };
    transientRef.current = next;
    setTransient(next);
  }
  async function finish(event: PointerEvent, cancel = false) {
    const active = gesture.current;
    gesture.current = null;
    if (area.current?.hasPointerCapture(event.pointerId))
      area.current.releasePointerCapture(event.pointerId);
    const changed = active?.node && transientRef.current?.nodes[active.node.id];
    if (active?.moved && changed && !cancel)
      await commit(
        [{ kind: 'update', id: changed.id, properties: changed.properties }],
        active.document.revision,
      );
    transientRef.current = null;
    setTransient(null);
  }
  function wheel(event: WheelEvent) {
    if (event.ctrlKey || event.metaKey)
      setZoom((current) => Math.max(0.05, Math.min(4, current * Math.exp(-event.deltaY * 0.005))));
    else setPan((current) => ({ x: current.x - event.deltaX, y: current.y - event.deltaY }));
  }
  return (
    <main
      ref={area}
      className={`canvas ${hand ? 'hand-tool' : ''} ${preview ? 'preview-canvas' : ''}`}
      onPointerDown={(event) => start(event)}
      onPointerMove={move}
      onPointerUp={(event) => void finish(event)}
      onPointerCancel={(event) => void finish(event, true)}
      onWheel={wheel}
      onContextMenu={(event) => event.preventDefault()}
      style={{
        backgroundPosition: `${pan.x}px ${pan.y}px`,
        backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
      }}
    >
      <div className="viewport-caption">
        ScreenGui{' '}
        <span>
          {document.viewport.width} × {document.viewport.height}
        </span>
      </div>
      <div
        className="artboard-position"
        style={
          {
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) translate(-50%, -50%)`,
            '--inverse-zoom': 1 / zoom,
          } as CSSProperties
        }
      >
        <div
          data-artboard
          data-project-id={document.id}
          className="artboard"
          style={{
            width: document.viewport.width,
            height: document.viewport.height,
            background: document.viewport.background,
          }}
        >
          <Scene
            key={preview ? 'playing' : 'editing'}
            document={transient ?? document}
            selectedId={selectedId}
            onPointer={(event, node, resize) => start(event, node, resize)}
            preview={preview}
          />
        </div>
      </div>
      {!preview && (
        <div className="canvas-tools" onPointerDown={(event) => event.stopPropagation()}>
          <IconButton label="Selecionar (V)" active={!hand} onClick={() => setHand(false)}>
            <CursorIcon weight={!hand ? 'fill' : 'regular'} />
          </IconButton>
          <IconButton label="Mover canvas (Espaço)" active={hand} onClick={() => setHand(true)}>
            <HandIcon />
          </IconButton>
          <i />
          <IconButton label="Frame (F)" disabled={busy} onClick={() => add('Frame')}>
            <RectangleIcon />
          </IconButton>
          <IconButton label="Texto (T)" disabled={busy} onClick={() => add('TextLabel')}>
            <TextTIcon />
          </IconButton>
          <IconButton label="Botão (B)" disabled={busy} onClick={() => add('TextButton')}>
            <CursorClickIcon />
          </IconButton>
          <IconButton label="Imagem (I)" disabled={busy} onClick={() => add('ImageLabel')}>
            <ImageIcon />
          </IconButton>
        </div>
      )}
      <div className="zoom-controls" onPointerDown={(event) => event.stopPropagation()}>
        <IconButton
          label="Diminuir zoom"
          onClick={() => setZoom((current) => Math.max(0.05, current / 1.2))}
        >
          <MinusIcon />
        </IconButton>
        <button className="zoom-value" onClick={() => setZoom(1)} title="Zoom 100%">
          {Math.round(zoom * 100)}%
        </button>
        <IconButton
          label="Aumentar zoom"
          onClick={() => setZoom((current) => Math.min(4, current * 1.2))}
        >
          <PlusIcon />
        </IconButton>
        <i />
        <IconButton label="Enquadrar" onClick={fit}>
          <CornersOutIcon />
        </IconButton>
      </div>
    </main>
  );
}
