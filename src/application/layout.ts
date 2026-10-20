import { childrenOf, nodeBounds } from '../domain/document';
import type { DesignDocument, NodeProperties } from '../domain/document';
import { isVisualClass } from '../domain/native';
import type { NativeValue } from '../domain/native';

function unit(value: NativeValue | undefined, axis: number, fallback = 0) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
  return Number(value.scale ?? 0) * axis + Number(value.offset ?? 0);
}
export function layoutChildren(
  document: DesignDocument,
  parentId: string,
  parentSize: { width: number; height: number },
) {
  const children = childrenOf(document, parentId);
  const result = new Map(
    children
      .filter((node) => isVisualClass(node.type))
      .map((node) => [node.id, nodeBounds(node.properties, parentSize)]),
  );
  const layout = children.find(
    (node) => node.type === 'UIListLayout' || node.type === 'UIGridLayout',
  );
  if (!layout) return result;
  const padding = children.find((node) => node.type === 'UIPadding')?.properties.native ?? {};
  const left = unit(padding.PaddingLeft, parentSize.width);
  const top = unit(padding.PaddingTop, parentSize.height);
  const right = unit(padding.PaddingRight, parentSize.width);
  const bottom = unit(padding.PaddingBottom, parentSize.height);
  const native = layout.properties.native;
  const horizontal =
    native.FillDirection === 'Horizontal' ||
    (layout.type === 'UIGridLayout' && native.FillDirection === undefined);
  const items = children
    .filter((node) => isVisualClass(node.type) && node.properties.visible)
    .sort((a, b) =>
      native.SortOrder === 'Name'
        ? a.name.localeCompare(b.name)
        : Number(a.properties.native.LayoutOrder ?? 0) -
          Number(b.properties.native.LayoutOrder ?? 0),
    );
  const innerWidth = Math.max(1, parentSize.width - left - right);
  const innerHeight = Math.max(1, parentSize.height - top - bottom);
  if (layout.type === 'UIGridLayout') {
    const size = native.CellSize as Record<string, number> | undefined;
    const gap = native.CellPadding as Record<string, number> | undefined;
    const width = Math.max(1, (size?.xScale ?? 0) * innerWidth + (size?.xOffset ?? 100));
    const height = Math.max(1, (size?.yScale ?? 0) * innerHeight + (size?.yOffset ?? 100));
    const gapX = (gap?.xScale ?? 0) * innerWidth + (gap?.xOffset ?? 5);
    const gapY = (gap?.yScale ?? 0) * innerHeight + (gap?.yOffset ?? 5);
    const columns = Math.max(1, Math.floor((innerWidth + gapX) / (width + gapX)));
    const rows = Math.max(1, Math.floor((innerHeight + gapY) / (height + gapY)));
    items.forEach((node, index) =>
      result.set(node.id, {
        x: left + (horizontal ? index % columns : Math.floor(index / rows)) * (width + gapX),
        y: top + (horizontal ? Math.floor(index / columns) : index % rows) * (height + gapY),
        width,
        height,
      }),
    );
  } else {
    const gap = unit(native.Padding, horizontal ? innerWidth : innerHeight);
    const occupied =
      items.reduce(
        (total, node) => total + result.get(node.id)![horizontal ? 'width' : 'height'],
        0,
      ) +
      Math.max(0, items.length - 1) * gap;
    const mainAlignment = native[horizontal ? 'HorizontalAlignment' : 'VerticalAlignment'];
    const available = (horizontal ? innerWidth : innerHeight) - occupied;
    let cursor =
      mainAlignment === 'Center'
        ? available / 2
        : mainAlignment === 'Right' || mainAlignment === 'Bottom'
          ? available
          : 0;
    for (const node of items) {
      const bounds = result.get(node.id)!;
      const alignment = native[horizontal ? 'VerticalAlignment' : 'HorizontalAlignment'];
      const crossSpace =
        (horizontal ? innerHeight : innerWidth) - (horizontal ? bounds.height : bounds.width);
      const cross =
        alignment === 'Center'
          ? crossSpace / 2
          : alignment === 'Right' || alignment === 'Bottom'
            ? crossSpace
            : 0;
      result.set(node.id, {
        ...bounds,
        x: left + (horizontal ? cursor : cross),
        y: top + (horizontal ? cross : cursor),
      });
      cursor += (horizontal ? bounds.width : bounds.height) + gap;
    }
  }
  return result;
}
export function decoratedProperties(
  document: DesignDocument,
  id: string,
  size: { width: number; height: number },
): NodeProperties {
  const p = { ...document.nodes[id]!.properties };
  for (const child of childrenOf(document, id)) {
    const native = child.properties.native;
    if (child.type === 'UICorner')
      p.corner = unit(native.CornerRadius, Math.min(size.width, size.height), 8);
    if (child.type === 'UIStroke')
      p.stroke = {
        color: String(native.Color ?? '#000000'),
        thickness: Number(native.Thickness ?? 1),
        transparency: Number(native.Transparency ?? 0),
      };
  }
  return p;
}
