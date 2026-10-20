import type { CSSProperties, PointerEvent } from 'react';
import { ImageIcon } from '@phosphor-icons/react';
import { childrenOf, nodeBounds } from '../domain/document';
import type { DesignDocument, DesignNode } from '../domain/document';
import { isVisualClass } from '../domain/native';
import { decoratedProperties, layoutChildren } from '../application/layout';

type NodePointer = (event: PointerEvent, node: DesignNode, resize?: string) => void;
export function Scene({
  document,
  selectedId,
  onPointer,
  preview = false,
  miniature = false,
}: {
  document: DesignDocument;
  selectedId?: string | null;
  onPointer?: NodePointer;
  preview?: boolean;
  miniature?: boolean;
}) {
  function render(
    node: DesignNode,
    parentSize: { width: number; height: number },
    layoutBounds?: { x: number; y: number; width: number; height: number },
  ) {
    if (!isVisualClass(node.type)) return null;
    const p = decoratedProperties(document, node.id, parentSize);
    if (!p.visible) return null;
    const bounds = layoutBounds ?? nodeBounds(p, parentSize);
    const childBounds = layoutChildren(document, node.id, bounds);
    const text = ['TextLabel', 'TextButton', 'TextBox'].includes(node.type);
    const alpha = 1 - p.transparency;
    const style: CSSProperties = {
      position: 'absolute',
      left: bounds.x,
      top: bounds.y,
      width: Math.max(0, bounds.width),
      height: Math.max(0, bounds.height),
      transform: `rotate(${p.rotation}deg)`,
      borderRadius: p.corner,
      zIndex: p.zIndex,
      overflow:
        node.type === 'ScrollingFrame' && preview
          ? 'auto'
          : p.clip || node.type === 'ScrollingFrame'
            ? 'hidden'
            : 'visible',
      backgroundColor: `rgb(${parseInt(p.fill.slice(1, 3), 16)} ${parseInt(p.fill.slice(3, 5), 16)} ${parseInt(p.fill.slice(5, 7), 16)} / ${alpha})`,
      color: p.textColor,
      fontSize: p.textSize,
      fontFamily:
        p.font === 'Arial'
          ? 'Arial, sans-serif'
          : p.font === 'SourceSans'
            ? '"Segoe UI", sans-serif'
            : 'system-ui, sans-serif',
      fontWeight: p.font === 'GothamBold' ? 700 : p.font === 'GothamMedium' ? 500 : 400,
      opacity: node.type === 'CanvasGroup' ? 1 - Number(p.native.GroupTransparency ?? 0) : 1,
      textAlign: p.textAlign.toLowerCase() as 'left' | 'center' | 'right',
      '--entry-duration': `${p.tween?.duration ?? 0}s`,
      '--entry-delay': `${p.tween?.delay ?? 0}s`,
      '--entry-easing': p.tween?.easing === 'Cubic' ? 'cubic-bezier(.22,.61,.36,1)' : 'ease-out',
    } as CSSProperties;
    if (p.gradient)
      style.backgroundImage = `linear-gradient(${p.gradient.rotation + 90}deg, ${p.gradient.from}${Math.round(
        alpha * 255,
      )
        .toString(16)
        .padStart(2, '0')}, ${p.gradient.to}${Math.round(alpha * 255)
        .toString(16)
        .padStart(2, '0')})`;
    if (p.stroke)
      style.boxShadow = `inset 0 0 0 ${p.stroke.thickness}px ${p.stroke.color}${Math.round(
        (1 - p.stroke.transparency) * 255,
      )
        .toString(16)
        .padStart(2, '0')}`;
    const selected = !preview && node.id === selectedId;
    return (
      <div
        key={node.id}
        data-node-id={node.id}
        className={`scene-node ${selected ? 'selected' : ''} ${preview && p.tween ? `entry-${p.tween.effect}` : ''}`}
        style={style}
        onPointerDown={onPointer && !p.locked ? (event) => onPointer(event, node) : undefined}
        aria-label={miniature ? undefined : `${node.type}: ${node.name}`}
      >
        {text && (
          <span
            className="node-text"
            style={{
              whiteSpace: p.textWrapped ? 'pre-wrap' : 'pre',
              overflow: 'hidden',
              textAlign: style.textAlign,
              opacity: 1 - Number(p.native.TextTransparency ?? 0),
              lineHeight: Number(p.native.LineHeight ?? 1.15),
            }}
          >
            {p.text}
          </span>
        )}
        {(node.type === 'ImageLabel' ||
          node.type === 'ImageButton' ||
          node.type === 'ViewportFrame' ||
          node.type.startsWith('Video')) && (
          <span className="image-placeholder" title={p.image || 'Imagem'}>
            <ImageIcon size={Math.min(32, bounds.height / 2)} />
            {!miniature && (
              <small>{p.image ? p.image.replace('rbxassetid://', '#') : 'Imagem'}</small>
            )}
          </span>
        )}
        {childrenOf(document, node.id).map((child) =>
          render(child, bounds, childBounds.get(child.id)),
        )}
        {selected && !p.locked && (
          <div className="selection-outline">
            {['nw', 'ne', 'sw', 'se'].map((corner) => (
              <i
                key={corner}
                className={`resize-handle ${corner}`}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  onPointer?.(event, node, corner);
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
  return (
    <>
      {childrenOf(document, document.rootId).map((node) =>
        render(
          node,
          document.viewport,
          layoutChildren(document, document.rootId, document.viewport).get(node.id),
        ),
      )}
    </>
  );
}
