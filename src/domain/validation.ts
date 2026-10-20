import { nodeTypes } from './document';
import { isVisualClass, robloxCatalog, validateNativeProperties } from './native';
import type { DesignDocument, NodeProperties } from './document';

const color = /^#[\da-f]{6}$/i;
const safeId = /^[a-zA-Z0-9_-]{1,100}$/;
function record(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Estrutura inválida.');
}
function finite(value: unknown, min: number, max: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
    throw new Error(`Número fora do intervalo ${min}–${max}.`);
}
function text(value: unknown, limit: number) {
  if (typeof value !== 'string' || value.length > limit)
    throw new Error('Texto inválido ou muito longo.');
}
function choice(value: unknown, choices: readonly string[]) {
  if (typeof value !== 'string' || !choices.includes(value))
    throw new Error('Valor de propriedade inválido.');
}
function hex(value: unknown) {
  if (typeof value !== 'string' || !color.test(value)) throw new Error('Cor deve usar #RRGGBB.');
}
export function validateProperties(value: unknown): asserts value is NodeProperties {
  record(value);
  for (const key of ['position', 'size']) {
    const unit = value[key];
    record(unit);
    finite(unit.xScale, -10, 10);
    finite(unit.yScale, -10, 10);
    finite(unit.xOffset, -100000, 100000);
    finite(unit.yOffset, -100000, 100000);
  }
  record(value.anchor);
  finite(value.anchor.x, 0, 1);
  finite(value.anchor.y, 0, 1);
  hex(value.fill);
  hex(value.textColor);
  finite(value.transparency, 0, 1);
  finite(value.rotation, -360, 360);
  finite(value.zIndex, 1, 10000);
  finite(value.corner, 0, 10000);
  finite(value.textSize, 1, 100);
  for (const key of ['visible', 'locked', 'clip', 'textWrapped'])
    if (typeof value[key] !== 'boolean') throw new Error('Propriedade booleana inválida.');
  text(value.text, 10000);
  text(value.image, 200);
  if (value.image !== '' && !/^rbxassetid:\/\/\d+$/.test(value.image as string))
    throw new Error('Use rbxassetid:// seguido do ID da imagem.');
  choice(value.font, ['Gotham', 'GothamMedium', 'GothamBold', 'SourceSans', 'Arial']);
  choice(value.textAlign, ['Left', 'Center', 'Right']);
  choice(value.imageFit, ['Fit', 'Crop', 'Stretch']);
  if (value.stroke !== null) {
    record(value.stroke);
    hex(value.stroke.color);
    finite(value.stroke.thickness, 0, 100);
    finite(value.stroke.transparency, 0, 1);
  }
  if (value.gradient !== null) {
    record(value.gradient);
    hex(value.gradient.from);
    hex(value.gradient.to);
    finite(value.gradient.rotation, -360, 360);
  }
  if (value.tween !== null) {
    record(value.tween);
    finite(value.tween.duration, 0.01, 60);
    finite(value.tween.delay, 0, 60);
    choice(value.tween.easing, ['Quad', 'Sine', 'Cubic']);
    choice(value.tween.effect, ['Fade', 'SlideUp']);
  }
}

export function validateDocument(value: unknown): asserts value is DesignDocument {
  record(value);
  if (value.formatVersion !== 1) throw new Error('Formato de projeto não suportado.');
  text(value.id, 100);
  if (!safeId.test(value.id as string)) throw new Error('ID de projeto inválido.');
  text(value.name, 120);
  if (!(value.name as string).trim()) throw new Error('Dê um nome ao projeto.');
  finite(value.revision, 0, Number.MAX_SAFE_INTEGER);
  if (!Number.isInteger(value.revision)) throw new Error('Revisão inválida.');
  record(value.viewport);
  finite(value.viewport.width, 64, 7680);
  finite(value.viewport.height, 64, 4320);
  hex(value.viewport.background);
  record(value.nodes);
  text(value.rootId, 100);
  const nodes = value.nodes;
  if (Object.keys(nodes).length > 2000) throw new Error('Limite de 2.000 camadas por projeto.');
  for (const [id, raw] of Object.entries(nodes)) {
    record(raw);
    if (!safeId.test(id) || ['__proto__', 'constructor', 'prototype'].includes(id) || raw.id !== id)
      throw new Error('ID de camada inválido.');
    text(raw.name, 120);
    choice(raw.type, nodeTypes);
    validateProperties(raw.properties);
    validateNativeProperties(String(raw.type), raw.properties.native, raw.type === 'ScreenGui');
    if (!Array.isArray(raw.children) || raw.children.some((child) => typeof child !== 'string'))
      throw new Error('Lista de camadas inválida.');
    if (new Set(raw.children).size !== raw.children.length)
      throw new Error('Camada duplicada na árvore.');
    if (raw.type !== 'ScreenGui' && !isVisualClass(String(raw.type)) && raw.children.length)
      throw new Error('Modificadores não recebem camadas filhas.');
    for (const [name, entry] of Object.entries(raw.properties.native)) {
      if (
        robloxCatalog.classes[String(raw.type)]?.properties[name]?.type === 'ref' &&
        entry !== null &&
        !Object.hasOwn(nodes, String(entry))
      )
        throw new Error('Referência de propriedade não encontrada.');
    }
    if (id === value.rootId) {
      if (raw.type !== 'ScreenGui' || raw.parentId !== null)
        throw new Error('ScreenGui deve ser a raiz.');
    } else if (raw.type === 'ScreenGui' || typeof raw.parentId !== 'string')
      throw new Error('Pai de camada inválido.');
  }
  const visited = new Set<string>();
  function visit(id: string, depth: number) {
    if (depth > 50 || visited.has(id)) throw new Error('Árvore cíclica ou profunda demais.');
    const raw = nodes[id];
    record(raw);
    visited.add(id);
    for (const childId of raw.children as string[]) {
      const child = nodes[childId];
      record(child);
      if (child.parentId !== id) throw new Error('Relação entre camadas inválida.');
      visit(childId, depth + 1);
    }
  }
  visit(value.rootId as string, 0);
  if (visited.size !== Object.keys(nodes).length) throw new Error('Há camadas fora da árvore.');
}
