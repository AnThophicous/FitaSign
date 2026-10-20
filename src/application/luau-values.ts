import type { NativeProperty, NativeValue } from '../domain/native';

export function quoted(value: string) {
  return (
    '"' +
    [...value]
      .map((char) => {
        if (char === '\\') return '\\\\';
        if (char === '"') return '\\"';
        const code = char.charCodeAt(0);
        return code < 32 || code === 127 ? '\\' + code.toString().padStart(3, '0') : char;
      })
      .join('') +
    '"'
  );
}
export function rgb(hex: string) {
  return `Color3.fromRGB(${[1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)).join(', ')})`;
}
export function nativeLuau(definition: NativeProperty, value: NativeValue): string {
  const data = value as Record<string, NativeValue>;
  switch (definition.type) {
    case 'bool':
    case 'int':
    case 'int64':
    case 'float':
    case 'double':
      return String(value);
    case 'enum':
      return `Enum.${definition.enum}.${value}`;
    case 'string':
    case 'ContentId':
      return quoted(String(value));
    case 'Content':
      return `Content.fromUri(${quoted(String(value))})`;
    case 'Color3':
      return rgb(String(value));
    case 'Vector2':
      return `Vector2.new(${data.x}, ${data.y})`;
    case 'Vector3':
      return `Vector3.new(${data.x}, ${data.y}, ${data.z})`;
    case 'UDim':
      return `UDim.new(${data.scale}, ${data.offset})`;
    case 'UDim2':
      return `UDim2.new(${data.xScale}, ${data.xOffset}, ${data.yScale}, ${data.yOffset})`;
    case 'Rect': {
      const min = data.min as Record<string, number>;
      const max = data.max as Record<string, number>;
      return `Rect.new(${min.x}, ${min.y}, ${max.x}, ${max.y})`;
    }
    case 'Font':
      return `Font.new(${quoted(String(data.family))}, Enum.FontWeight.${data.weight}, Enum.FontStyle.${data.style})`;
    case 'ColorSequence':
      return `ColorSequence.new({ ${(value as Record<string, NativeValue>[]).map((point) => `ColorSequenceKeypoint.new(${point.time}, ${rgb(String(point.color))})`).join(', ')} })`;
    case 'NumberSequence':
      return `NumberSequence.new({ ${(value as Record<string, NativeValue>[]).map((point) => `NumberSequenceKeypoint.new(${point.time}, ${point.value}, ${point.envelope ?? 0})`).join(', ')} })`;
    case 'ref':
      return 'nil';
    default:
      throw new Error('Tipo de propriedade desconhecido.');
  }
}
