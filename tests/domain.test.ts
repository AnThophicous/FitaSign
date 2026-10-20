import { describe, expect, it } from 'vitest';
import { createDocument, nodeBounds, udim } from '../src/domain/document';
import { validateDocument } from '../src/domain/validation';
import { applyCommands } from '../src/application/commands';
import { DesignSession } from '../src/application/session';
import { exportLuau } from '../src/application/export-luau';
import { exampleDocument } from '../src/application/examples';

const fresh = () => createDocument('test', 'Projeto');
const addFrame = {
  kind: 'add' as const,
  id: 'frame',
  name: 'Frame',
  type: 'Frame' as const,
  parentId: 'screen',
};
describe('edição do documento', () => {
  it('adiciona uma camada sem alterar o documento anterior', () => {
    const original = fresh();
    const next = applyCommands(original, [addFrame]);
    expect(original.nodes.screen!.children).toEqual([]);
    expect(next.nodes.frame!.parentId).toBe('screen');
    expect(next.revision).toBe(1);
    expect(next.nodes.screen!.children).toEqual(['frame']);
  });
  it('rejeita todo o lote quando uma alteração falha', () => {
    const original = fresh();
    expect(() =>
      applyCommands(original, [
        addFrame,
        { kind: 'update', id: 'frame', properties: { transparency: 2 } },
      ]),
    ).toThrow();
    expect(Object.keys(original.nodes)).toEqual(['screen']);
  });
  it('impede ciclos ao reparentear', () => {
    const original = applyCommands(fresh(), [
      addFrame,
      { ...addFrame, id: 'child', parentId: 'frame' },
    ]);
    expect(() =>
      applyCommands(original, [{ kind: 'move', id: 'frame', parentId: 'child' }]),
    ).toThrow();
  });
  it('remove descendentes e a referência no pai', () => {
    const original = applyCommands(fresh(), [
      addFrame,
      { ...addFrame, id: 'child', parentId: 'frame' },
    ]);
    const next = applyCommands(original, [{ kind: 'remove', id: 'frame' }]);
    expect(Object.keys(next.nodes)).toEqual(['screen']);
    expect(next.nodes.screen!.children).toEqual([]);
  });
  it('preserva a ordem ao mover dentro do mesmo pai', () => {
    const original = applyCommands(fresh(), [addFrame, { ...addFrame, id: 'other' }]);
    const next = applyCommands(original, [
      { kind: 'move', id: 'other', parentId: 'screen', index: 0 },
    ]);
    expect(next.nodes.screen!.children).toEqual(['other', 'frame']);
  });
  it.each(['__proto__', 'constructor', 'prototype', '../outside'])(
    'rejeita IDs reservados e caminhos: %s',
    (id) => {
      expect(() => applyCommands(fresh(), [{ ...addFrame, id }])).toThrow();
      expect(() =>
        applyCommands(fresh(), [{ kind: 'update', id, properties: { text: 'bad' } }]),
      ).toThrow();
      expect(Object.prototype).not.toHaveProperty('properties');
    },
  );
  it('mantém revisões crescentes em desfazer e refazer', () => {
    const session = new DesignSession(fresh());
    session.commit([addFrame], 0);
    expect(session.undo().revision).toBe(2);
    expect(session.snapshot().nodes.frame).toBeUndefined();
    expect(session.redo().revision).toBe(3);
    expect(session.snapshot().nodes.frame).toBeDefined();
    expect(() => session.commit([{ kind: 'rename', name: 'Outro' }], 1)).toThrow(/revisão/);
  });
  it('limpa refazer depois de uma nova alteração', () => {
    const session = new DesignSession(fresh());
    session.commit([addFrame]);
    session.undo();
    session.commit([{ kind: 'rename', name: 'Outro' }]);
    expect(session.history().canRedo).toBe(false);
  });
  it('resolve escala, offset e âncora no espaço do pai', () => {
    const document = applyCommands(fresh(), [
      {
        ...addFrame,
        properties: {
          position: udim(10, 20, 0.5, 0.5),
          size: udim(100, 50, 0.5, 0),
          anchor: { x: 0.5, y: 0.5 },
        },
      },
    ]);
    expect(nodeBounds(document.nodes.frame!.properties, { width: 800, height: 600 })).toEqual({
      x: 160,
      y: 295,
      width: 500,
      height: 50,
    });
  });
});
describe('validação na fronteira', () => {
  it('recusa nós órfãos e referência duplicada', () => {
    const document = applyCommands(fresh(), [addFrame]);
    document.nodes.screen!.children.push('frame');
    expect(() => validateDocument(document)).toThrow();
    document.nodes.screen!.children = [];
    expect(() => validateDocument(document)).toThrow();
  });
  it('recusa valores não finitos, formatos futuros e imagens arbitrárias', () => {
    const document = fresh();
    document.viewport.width = NaN;
    expect(() => validateDocument(document)).toThrow();
    expect(() => validateDocument({ ...fresh(), formatVersion: 99 })).toThrow(/Formato/);
    expect(() =>
      applyCommands(fresh(), [{ ...addFrame, properties: { image: 'https://example.com/pixel' } }]),
    ).toThrow(/rbxassetid/);
  });
});
describe('Luau', () => {
  it('exporta propriedades relativas, cantos, stroke e gradiente', () => {
    const document = exampleDocument('demo');
    const source = exportLuau(document);
    expect(source).toContain('Instance.new("ScreenGui")');
    expect(source).toContain('UDim2.new(1, 0, 1, 0)');
    expect(source).toContain('Instance.new("UICorner")');
    expect(source).toContain('Enum.ApplyStrokeMode.Border');
    expect(source).toContain('ColorSequence.new(');
    expect(source).toContain('TweenService:Create');
    expect(source.indexOf('screenGui.Parent = parent')).toBeGreaterThan(
      source.indexOf('node1.Parent = screenGui'),
    );
  });
  it('preserva Unicode e escapa strings sem injetar código', () => {
    const text = 'Olá "jogo"\n\\script\u0001';
    const document = applyCommands(fresh(), [
      { ...addFrame, type: 'TextLabel', name: 'end) --', properties: { text } },
    ]);
    const source = exportLuau(document);
    expect(source).toContain('Olá \\"jogo\\"\\010\\\\script\\001');
    expect(source).toContain('node1.Name = "end) --"');
    expect(source).not.toContain('local end)');
  });
  it('exporta imagem e fade com os tipos corretos', () => {
    const document = applyCommands(fresh(), [
      {
        ...addFrame,
        type: 'ImageLabel',
        properties: {
          image: 'rbxassetid://123',
          imageFit: 'Crop',
          tween: { effect: 'Fade', easing: 'Quad', duration: 0.2, delay: 0 },
        },
      },
    ]);
    const source = exportLuau(document);
    expect(source).toContain('Enum.ScaleType.Crop');
    expect(source).toContain('ImageTransparency = 0');
  });
});
