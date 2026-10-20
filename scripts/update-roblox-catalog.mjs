import { readFile, writeFile } from 'node:fs/promises';

const version =
  process.argv[3] ??
  (
    await (
      await fetch(
        'https://clientsettingscdn.roblox.com/v2/client-version/WindowsStudio64/channel/LIVE',
      )
    ).json()
  ).clientVersionUpload;
const source = `https://setup.rbxcdn.com/${version}-API-Dump.json`;
const dump = process.argv[2]
  ? JSON.parse(await readFile(process.argv[2], 'utf8'))
  : await (await fetch(source)).json();
const classes = new Map(dump.Classes.map((item) => [item.Name, item]));
function derives(name, base) {
  return name === base || (classes.has(name) && derives(classes.get(name).Superclass, base));
}
const supported = new Set([
  'bool',
  'int',
  'int64',
  'float',
  'double',
  'string',
  'Content',
  'ContentId',
  'Color3',
  'Vector2',
  'Vector3',
  'UDim',
  'UDim2',
  'Rect',
  'NumberSequence',
  'ColorSequence',
  'Font',
]);
const excluded = new Set([
  'Name',
  'Parent',
  'Archivable',
  'SourceAssetId',
  'HistoryId',
  'UniqueId',
  'Tags',
  'Sandboxed',
]);
function members(name) {
  const item = classes.get(name);
  if (!item) return [];
  return [
    ...members(item.Superclass),
    ...item.Members.filter(
      (member) =>
        member.MemberType === 'Property' &&
        member.Security.Write === 'None' &&
        !member.Tags?.some((tag) =>
          ['ReadOnly', 'Hidden', 'NotScriptable', 'Deprecated'].includes(tag),
        ) &&
        !excluded.has(member.Name) &&
        (supported.has(member.ValueType.Name) ||
          member.ValueType.Category === 'Enum' ||
          member.ValueType.Category === 'Class'),
    ),
  ];
}
const selected = dump.Classes.filter(
  (item) =>
    (derives(item.Name, 'GuiObject') ||
      derives(item.Name, 'UIComponent') ||
      item.Name === 'ScreenGui') &&
    !item.Tags?.some((tag) => ['NotCreatable', 'Deprecated'].includes(tag)),
);
const enums = Object.fromEntries(
  dump.Enums.map((item) => [
    item.Name,
    item.Items.filter((entry) => !entry.Tags?.includes('Deprecated')).map((entry) => entry.Name),
  ]),
);
const usedEnums = new Set();
const catalog = Object.fromEntries(
  selected.map((item) => [
    item.Name,
    {
      visual: derives(item.Name, 'GuiObject'),
      properties: Object.fromEntries(
        members(item.Name).map((property) => {
          if (property.ValueType.Category === 'Enum') usedEnums.add(property.ValueType.Name);
          return [
            property.Name,
            {
              type:
                property.ValueType.Category === 'Enum'
                  ? 'enum'
                  : property.ValueType.Category === 'Class'
                    ? 'ref'
                    : property.ValueType.Name,
              ...(property.ValueType.Category === 'Enum' ? { enum: property.ValueType.Name } : {}),
              category: property.Category,
            },
          ];
        }),
      ),
    },
  ]),
);
const result = {
  version,
  source,
  classes: catalog,
  enums: Object.fromEntries([...usedEnums].sort().map((name) => [name, enums[name]])),
};
await writeFile('src/domain/roblox-catalog.json', JSON.stringify(result, null, 2) + '\n');
console.log(
  JSON.stringify({
    classes: selected.length,
    properties: Object.values(catalog).reduce(
      (sum, item) => sum + Object.keys(item.properties).length,
      0,
    ),
    enumChoices: Object.values(catalog).reduce(
      (sum, item) =>
        sum +
        Object.values(item.properties).reduce(
          (count, property) => count + (property.enum ? enums[property.enum].length : 0),
          0,
        ),
      0,
    ),
  }),
);
