import { initialNativeProperties, robloxCatalog } from './native';
import type { NativeValue } from './native';
export const nodeTypes = Object.keys(robloxCatalog.classes);
export type NodeType = string;
export type Vector2 = { x: number; y: number };
export type UDim2 = { xScale: number; xOffset: number; yScale: number; yOffset: number };
export type Gradient = { from: string; to: string; rotation: number };
export type Stroke = { color: string; thickness: number; transparency: number };
export type Tween = {
  duration: number;
  delay: number;
  easing: 'Quad' | 'Sine' | 'Cubic';
  effect: 'Fade' | 'SlideUp';
};

export interface NodeProperties {
  native: Record<string, NativeValue>;
  position: UDim2;
  size: UDim2;
  anchor: Vector2;
  rotation: number;
  fill: string;
  transparency: number;
  visible: boolean;
  locked: boolean;
  clip: boolean;
  zIndex: number;
  corner: number;
  stroke: Stroke | null;
  gradient: Gradient | null;
  text: string;
  textColor: string;
  textSize: number;
  font: 'Gotham' | 'GothamMedium' | 'GothamBold' | 'SourceSans' | 'Arial';
  textAlign: 'Left' | 'Center' | 'Right';
  textWrapped: boolean;
  image: string;
  imageFit: 'Fit' | 'Crop' | 'Stretch';
  tween: Tween | null;
}

export interface DesignNode {
  id: string;
  type: NodeType;
  name: string;
  parentId: string | null;
  children: string[];
  properties: NodeProperties;
}

export interface DesignDocument {
  formatVersion: 1;
  id: string;
  name: string;
  revision: number;
  viewport: { width: number; height: number; background: string };
  rootId: string;
  nodes: Record<string, DesignNode>;
}

export const udim = (xOffset = 0, yOffset = 0, xScale = 0, yScale = 0): UDim2 => ({
  xScale,
  xOffset,
  yScale,
  yOffset,
});

export function defaultProperties(type: NodeType): NodeProperties {
  return {
    native: initialNativeProperties(type),
    position: udim(40, 40),
    size: udim(type.startsWith('Text') ? 200 : 240, type.startsWith('Text') ? 48 : 160),
    anchor: { x: 0, y: 0 },
    rotation: 0,
    fill: type === 'TextLabel' ? '#ffffff' : '#b0b0b0',
    transparency: type === 'TextLabel' ? 1 : 0,
    visible: true,
    locked: false,
    clip: false,
    zIndex: 1,
    corner: type === 'TextButton' ? 8 : 0,
    stroke: null,
    gradient: null,
    text: type === 'TextButton' ? 'Botão' : 'Texto',
    textColor: type === 'TextLabel' ? '#d6d6d6' : '#262626',
    textSize: 20,
    font: 'Gotham',
    textAlign: 'Center',
    textWrapped: true,
    image: '',
    imageFit: 'Fit',
    tween: null,
  };
}

export function createDocument(id: string, name: string): DesignDocument {
  const root: DesignNode = {
    id: 'screen',
    type: 'ScreenGui',
    name: 'ScreenGui',
    parentId: null,
    children: [],
    properties: {
      ...defaultProperties('ScreenGui'),
      position: udim(),
      size: udim(0, 0, 1, 1),
      fill: '#242424',
    },
  };
  return {
    formatVersion: 1,
    id,
    name,
    revision: 0,
    viewport: { width: 1280, height: 720, background: '#242424' },
    rootId: root.id,
    nodes: { [root.id]: root },
  };
}

export function childrenOf(document: DesignDocument, nodeId: string): DesignNode[] {
  const node = document.nodes[nodeId];
  if (!node) throw new Error('Camada não encontrada.');
  return node.children.map((id) => document.nodes[id]!);
}

export function descendantsOf(document: DesignDocument, id: string): string[] {
  return [id, ...childrenOf(document, id).flatMap((child) => descendantsOf(document, child.id))];
}

export function nodeBounds(properties: NodeProperties, parent: { width: number; height: number }) {
  const width = properties.size.xScale * parent.width + properties.size.xOffset;
  const height = properties.size.yScale * parent.height + properties.size.yOffset;
  return {
    width,
    height,
    x:
      properties.position.xScale * parent.width +
      properties.position.xOffset -
      properties.anchor.x * width,
    y:
      properties.position.yScale * parent.height +
      properties.position.yOffset -
      properties.anchor.y * height,
  };
}
