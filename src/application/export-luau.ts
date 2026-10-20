import { childrenOf } from '../domain/document';
import type { DesignDocument, DesignNode, UDim2 } from '../domain/document';
import { validateDocument } from '../domain/validation';
import { isVisualClass, robloxCatalog } from '../domain/native';
import { nativeLuau, quoted, rgb } from './luau-values';

function unit(value: UDim2) {
  return `UDim2.new(${value.xScale}, ${value.xOffset}, ${value.yScale}, ${value.yOffset})`;
}

export function exportLuau(document: DesignDocument): string {
  validateDocument(document);
  const lines = [
    '--!strict',
    '',
    'local TweenService = game:GetService("TweenService")',
    '',
    'return function(parent: Instance): ScreenGui',
    '\tlocal screenGui = Instance.new("ScreenGui")',
    `\tscreenGui.Name = ${quoted(document.nodes[document.rootId]!.name)}`,
    '\tscreenGui.ResetOnSpawn = false',
    '\tscreenGui.IgnoreGuiInset = true',
    '\tscreenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling',
  ];
  let index = 0;
  const names = new Map([[document.rootId, 'screenGui']]);
  const references: { variable: string; property: string; target: string | null }[] = [];
  function nativeProperties(node: DesignNode, variable: string) {
    for (const [property, value] of Object.entries(node.properties.native)) {
      const definition = robloxCatalog.classes[node.type]!.properties[property]!;
      if (definition.type === 'ref')
        references.push({ variable, property, target: value as string | null });
      else lines.push(`\t${variable}.${property} = ${nativeLuau(definition, value)}`);
    }
  }
  nativeProperties(document.nodes[document.rootId]!, 'screenGui');
  function write(node: DesignNode, parent: string) {
    const name = `node${++index}`;
    names.set(node.id, name);
    const p = node.properties;
    lines.push('', `\tlocal ${name} = Instance.new(${quoted(node.type)})`);
    if (!isVisualClass(node.type)) {
      lines.push(`\t${name}.Name = ${quoted(node.name)}`);
      nativeProperties(node, name);
      lines.push(`\t${name}.Parent = ${parent}`);
      return;
    }
    const properties: Record<string, string> = {
      Name: quoted(node.name),
      Position: unit(p.position),
      Size: unit(p.size),
      AnchorPoint: `Vector2.new(${p.anchor.x}, ${p.anchor.y})`,
      Rotation: String(p.rotation),
      BackgroundColor3: rgb(p.fill),
      BackgroundTransparency: String(p.transparency),
      BorderSizePixel: '0',
      Visible: String(p.visible),
      ClipsDescendants: String(p.clip),
      ZIndex: String(p.zIndex),
    };
    if (['TextLabel', 'TextButton', 'TextBox'].includes(node.type))
      Object.assign(properties, {
        Text: quoted(p.text),
        TextColor3: rgb(p.textColor),
        TextSize: String(p.textSize),
        Font: `Enum.Font.${p.font}`,
        TextXAlignment: `Enum.TextXAlignment.${p.textAlign}`,
        TextWrapped: String(p.textWrapped),
        RichText: 'false',
      });
    if (node.type === 'TextButton') properties.AutoButtonColor = 'false';
    if (node.type === 'ImageLabel' || node.type === 'ImageButton')
      Object.assign(properties, {
        Image: quoted(p.image),
        ScaleType: `Enum.ScaleType.${p.imageFit}`,
      });
    for (const [key, value] of Object.entries(properties))
      lines.push(`\t${name}.${key} = ${value}`);
    nativeProperties(node, name);
    if (p.corner > 0)
      lines.push(
        `\tlocal corner${index} = Instance.new("UICorner")`,
        `\tcorner${index}.CornerRadius = UDim.new(0, ${p.corner})`,
        `\tcorner${index}.Parent = ${name}`,
      );
    if (p.stroke)
      lines.push(
        `\tlocal stroke${index} = Instance.new("UIStroke")`,
        `\tstroke${index}.ApplyStrokeMode = Enum.ApplyStrokeMode.Border`,
        `\tstroke${index}.Color = ${rgb(p.stroke.color)}`,
        `\tstroke${index}.Thickness = ${p.stroke.thickness}`,
        `\tstroke${index}.Transparency = ${p.stroke.transparency}`,
        `\tstroke${index}.Parent = ${name}`,
      );
    if (p.gradient)
      lines.push(
        `\tlocal gradient${index} = Instance.new("UIGradient")`,
        `\tgradient${index}.Color = ColorSequence.new(${rgb(p.gradient.from)}, ${rgb(p.gradient.to)})`,
        `\tgradient${index}.Rotation = ${p.gradient.rotation}`,
        `\tgradient${index}.Parent = ${name}`,
      );
    lines.push(`\t${name}.Parent = ${parent}`);
    if (p.tween) {
      const info = `TweenInfo.new(${p.tween.duration}, Enum.EasingStyle.${p.tween.easing}, Enum.EasingDirection.Out, 0, false, ${p.tween.delay})`;
      if (p.tween.effect === 'SlideUp') {
        lines.push(
          `\t${name}.Position = ${unit({ ...p.position, yOffset: p.position.yOffset + 24 })}`,
          `\tTweenService:Create(${name}, ${info}, { Position = ${unit(p.position)} }):Play()`,
        );
      } else {
        const goals = [`BackgroundTransparency = ${p.transparency}`];
        lines.push(`\t${name}.BackgroundTransparency = 1`);
        if (node.type.startsWith('Text')) {
          lines.push(`\t${name}.TextTransparency = 1`);
          goals.push('TextTransparency = 0');
        }
        if (node.type === 'ImageLabel') {
          lines.push(`\t${name}.ImageTransparency = 1`);
          goals.push('ImageTransparency = 0');
        }
        lines.push(`\tTweenService:Create(${name}, ${info}, { ${goals.join(', ')} }):Play()`);
      }
    }
    for (const child of childrenOf(document, node.id)) write(child, name);
  }
  for (const node of childrenOf(document, document.rootId)) write(node, 'screenGui');
  for (const reference of references)
    lines.push(
      `\t${reference.variable}.${reference.property} = ${reference.target ? names.get(reference.target) : 'nil'}`,
    );
  lines.push('', '\tscreenGui.Parent = parent', '\treturn screenGui', 'end', '');
  return lines.join('\n');
}
