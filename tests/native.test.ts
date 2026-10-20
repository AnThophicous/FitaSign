import { describe, expect, it } from 'vitest';
import { createDocument, udim } from '../src/domain/document';
import { defaultNativeValue, robloxCatalog, validateNativeValue } from '../src/domain/native';
import type { NativeValue } from '../src/domain/native';
import { applyCommands } from '../src/application/commands';
import { exportLuau } from '../src/application/export-luau';
import { layoutChildren } from '../src/application/layout';

describe('propriedades nativas Roblox', () => {
  it('usa a direção horizontal padrão do UIGridLayout', () => {
    const document = applyCommands(createDocument('test', 'Grid'), [
      { kind: 'add', id: 'a', parentId: 'screen', type: 'Frame', name: 'A' },
      { kind: 'add', id: 'b', parentId: 'screen', type: 'Frame', name: 'B' },
      { kind: 'add', id: 'grid', parentId: 'screen', type: 'UIGridLayout', name: 'Grid' },
    ]);
    const bounds = layoutChildren(document, 'screen', document.viewport);
    expect(bounds.get('b')).toMatchObject({ x: 112, y: 0, width: 100, height: 100 });
  });
  it('cada classe do catálogo pode ser criada e exportada', () => {
    for (const type of Object.keys(robloxCatalog.classes).filter((type) => type !== 'ScreenGui')) {
      const document = applyCommands(createDocument('test', 'Catálogo'), [
        { kind: 'add', id: 'native', parentId: 'screen', type, name: type },
      ]);
      const source = exportLuau(document);
      expect(source).toContain(`Instance.new("${type}")`);
      if (!robloxCatalog.classes[type]!.visual) expect(source).not.toContain('node1.Position =');
    }
  });
  it('valida todos os tipos de propriedade do catálogo', () => {
    for (const entry of Object.values(robloxCatalog.classes))
      for (const definition of Object.values(entry.properties))
        expect(() => validateNativeValue(definition, defaultNativeValue(definition))).not.toThrow();
  });
  it('exporta enums, unidades, sequências e Font como valores nativos', () => {
    const document = applyCommands(createDocument('test', 'UI'), [
      {
        kind: 'add',
        id: 'label',
        parentId: 'screen',
        type: 'TextLabel',
        name: 'Texto',
        properties: {
          native: {
            FontFace: {
              family: 'rbxasset://fonts/families/SourceSansPro.json',
              weight: 'Bold',
              style: 'Normal',
            },
            TextScaled: true,
          },
        },
      },
      {
        kind: 'add',
        id: 'gradient',
        parentId: 'label',
        type: 'UIGradient',
        name: 'Gradiente',
        properties: {
          native: {
            Color: [
              { time: 0, color: '#ffffff' },
              { time: 1, color: '#808080' },
            ],
          },
        },
      },
      { kind: 'add', id: 'layout', parentId: 'screen', type: 'UIListLayout', name: 'Lista' },
    ]);
    const source = exportLuau(document);
    expect(source).toContain('Enum.FontWeight.Bold');
    expect(source).toContain('ColorSequenceKeypoint.new(1, Color3.fromRGB(128, 128, 128))');
    expect(source).toContain('UDim.new(0, 12)');
  });
  it('rejeita propriedades inexistentes, enums falsos, referências externas e ciclos de sequência', () => {
    const base = createDocument('test', 'UI');
    const invalid: Record<string, NativeValue>[] = [
      { Source: 'os.execute()' },
      { AutomaticSize: 'Arbitrary' },
      { NextSelectionDown: 'missing' },
    ];
    for (const native of invalid)
      expect(() =>
        applyCommands(base, [
          {
            kind: 'add',
            id: 'frame',
            parentId: 'screen',
            type: 'Frame',
            name: 'Frame',
            properties: { native },
          },
        ]),
      ).toThrow();
    expect(() =>
      validateNativeValue({ type: 'NumberSequence', category: '' }, [
        { time: 1, value: 1 },
        { time: 0, value: 0 },
      ]),
    ).toThrow();
  });
  it('resolve lista e padding no preview', () => {
    const document = applyCommands(createDocument('test', 'Lista'), [
      {
        kind: 'add',
        id: 'a',
        parentId: 'screen',
        type: 'Frame',
        name: 'A',
        properties: { size: udim(100, 40) },
      },
      {
        kind: 'add',
        id: 'b',
        parentId: 'screen',
        type: 'Frame',
        name: 'B',
        properties: { size: udim(100, 40) },
      },
      {
        kind: 'add',
        id: 'padding',
        parentId: 'screen',
        type: 'UIPadding',
        name: 'Padding',
        properties: { native: { PaddingLeft: { scale: 0, offset: 20 } } },
      },
      { kind: 'add', id: 'list', parentId: 'screen', type: 'UIListLayout', name: 'Lista' },
    ]);
    const bounds = layoutChildren(document, 'screen', document.viewport);
    expect(bounds.get('a')).toMatchObject({ x: 20, y: 0 });
    expect(bounds.get('b')).toMatchObject({ x: 20, y: 52 });
  });
});
