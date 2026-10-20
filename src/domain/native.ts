import snapshot from './roblox-catalog.json';

export type NativeValue =
  null | string | number | boolean | NativeValue[] | { [key: string]: NativeValue };
export interface NativeProperty {
  type: string;
  enum?: string;
  category: string;
}
export interface NativeClass {
  visual: boolean;
  properties: Record<string, NativeProperty>;
}
export const robloxCatalog = snapshot as {
  version: string;
  source: string;
  classes: Record<string, NativeClass>;
  enums: Record<string, string[]>;
};
export const corePropertyNames = new Set([
  'Position',
  'Size',
  'AnchorPoint',
  'Rotation',
  'BackgroundColor3',
  'BackgroundTransparency',
  'BorderSizePixel',
  'Visible',
  'ClipsDescendants',
  'ZIndex',
  'Text',
  'TextColor3',
  'TextSize',
  'Font',
  'TextXAlignment',
  'TextWrapped',
  'Image',
  'ScaleType',
]);
export function isVisualClass(type: string) {
  return robloxCatalog.classes[type]?.visual === true;
}
function object(value: NativeValue): Record<string, NativeValue> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Objeto de propriedade inválido.');
  return value;
}
function number(value: NativeValue | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > 1e9)
    throw new Error('Número nativo inválido.');
}
function string(value: NativeValue | undefined) {
  if (typeof value !== 'string' || value.length > 10000) throw new Error('Texto nativo inválido.');
}
function color(value: NativeValue | undefined) {
  if (typeof value !== 'string' || !/^#[\da-f]{6}$/i.test(value))
    throw new Error('Use uma cor #RRGGBB.');
}
export function validateNativeValue(definition: NativeProperty, value: NativeValue) {
  const type = definition.type;
  if (['float', 'double', 'int', 'int64'].includes(type)) {
    number(value);
    if (type.startsWith('int') && !Number.isInteger(value))
      throw new Error('Use um número inteiro.');
    return;
  }
  if (type === 'bool') {
    if (typeof value !== 'boolean') throw new Error('Use verdadeiro ou falso.');
    return;
  }
  if (type === 'enum') {
    if (typeof value !== 'string' || !robloxCatalog.enums[definition.enum!]?.includes(value))
      throw new Error('Valor Enum inválido.');
    return;
  }
  if (['string', 'Content', 'ContentId'].includes(type)) {
    string(value);
    return;
  }
  if (type === 'Color3') {
    color(value);
    return;
  }
  if (type === 'ref') {
    if (value !== null && (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)))
      throw new Error('Use o ID de uma camada ou null.');
    return;
  }
  if (type === 'ColorSequence' || type === 'NumberSequence') {
    if (!Array.isArray(value) || value.length < 2 || value.length > 20)
      throw new Error('Sequências exigem de 2 a 20 pontos.');
    let previous = -1;
    for (const raw of value) {
      const point = object(raw);
      number(point.time);
      const time = point.time as number;
      if (time < 0 || time > 1 || time <= previous)
        throw new Error('Tempos da sequência devem crescer entre 0 e 1.');
      previous = time;
      if (type === 'ColorSequence') color(point.color);
      else {
        number(point.value);
        if (point.envelope !== undefined) {
          number(point.envelope);
          if ((point.envelope as number) < 0) throw new Error('Envelope negativo.');
        }
      }
    }
    if (object(value[0]!).time !== 0 || object(value.at(-1)!).time !== 1)
      throw new Error('A sequência começa em 0 e termina em 1.');
    return;
  }
  const data = object(value);
  if (type === 'Font') {
    string(data.family);
    if (typeof data.family !== 'string' || !/^rbxasset(?:id)?:\/\//.test(data.family))
      throw new Error('Use o asset de uma família de fonte.');
    if (
      ![
        'Thin',
        'ExtraLight',
        'Light',
        'Regular',
        'Medium',
        'SemiBold',
        'Bold',
        'ExtraBold',
        'Heavy',
      ].includes(String(data.weight)) ||
      !['Normal', 'Italic'].includes(String(data.style))
    )
      throw new Error('Peso ou estilo de fonte inválido.');
    return;
  }
  if (type === 'Rect') {
    for (const key of ['min', 'max']) {
      const point = object(data[key]!);
      number(point.x);
      number(point.y);
    }
    return;
  }
  const fields: Record<string, string[]> = {
    Vector2: ['x', 'y'],
    Vector3: ['x', 'y', 'z'],
    UDim: ['scale', 'offset'],
    UDim2: ['xScale', 'xOffset', 'yScale', 'yOffset'],
  };
  const keys = fields[type];
  if (!keys) throw new Error('Tipo nativo não suportado.');
  for (const key of keys) number(data[key]);
}
export function validateNativeProperties(type: string, properties: unknown, root = false) {
  if (!properties || typeof properties !== 'object' || Array.isArray(properties))
    throw new Error('Propriedades Roblox inválidas.');
  if (Object.keys(properties).length > 150) throw new Error('Propriedades demais na camada.');
  for (const [name, value] of Object.entries(properties)) {
    const definition = robloxCatalog.classes[type]?.properties[name];
    if (!definition) throw new Error(`Propriedade ${name} não existe em ${type}.`);
    if (!root && isVisualClass(type) && corePropertyNames.has(name))
      throw new Error(`${name} usa o controle básico correspondente.`);
    validateNativeValue(definition, value as NativeValue);
  }
}
export function defaultNativeValue(definition: NativeProperty): NativeValue {
  switch (definition.type) {
    case 'bool':
      return false;
    case 'string':
    case 'Content':
    case 'ContentId':
      return '';
    case 'Color3':
      return '#d0d0d0';
    case 'enum':
      return robloxCatalog.enums[definition.enum!]?.[0] ?? '';
    case 'ref':
      return null;
    case 'Vector2':
      return { x: 0, y: 0 };
    case 'Vector3':
      return { x: 0, y: 0, z: 0 };
    case 'UDim':
      return { scale: 0, offset: 0 };
    case 'UDim2':
      return { xScale: 0, xOffset: 0, yScale: 0, yOffset: 0 };
    case 'Rect':
      return { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } };
    case 'Font':
      return {
        family: 'rbxasset://fonts/families/SourceSansPro.json',
        weight: 'Regular',
        style: 'Normal',
      };
    case 'NumberSequence':
      return [
        { time: 0, value: 0 },
        { time: 1, value: 1 },
      ];
    case 'ColorSequence':
      return [
        { time: 0, color: '#ffffff' },
        { time: 1, color: '#808080' },
      ];
    default:
      return 0;
  }
}
export function initialNativeProperties(type: string): Record<string, NativeValue> {
  if (type === 'UIListLayout')
    return {
      FillDirection: 'Vertical',
      Padding: { scale: 0, offset: 12 },
      SortOrder: 'LayoutOrder',
    };
  if (type === 'UIGridLayout')
    return {
      CellSize: { xScale: 0, xOffset: 100, yScale: 0, yOffset: 100 },
      CellPadding: { xScale: 0, xOffset: 12, yScale: 0, yOffset: 12 },
    };
  if (type === 'UICorner') return { CornerRadius: { scale: 0, offset: 12 } };
  if (type === 'UIAspectRatioConstraint') return { AspectRatio: 1 };
  if (type === 'UIScale') return { Scale: 1 };
  if (type === 'UIStroke') return { Color: '#c0c0c0', Thickness: 1, ApplyStrokeMode: 'Border' };
  return {};
}
