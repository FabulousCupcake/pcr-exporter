const decrypt = require('./lib/decrypt');

// Plugin Metadata
const defaultConfig = { enabled: true };
const defaultConfigDetails = {};
const pluginName = 'Material Spreadsheet Exporter';
const pluginDescription = 'Exports material data into tab-separated values format that can be pasted into spreadsheets';

// Tab character…
const TAB = '	';

// List of notable items
const NOTABLE_MATERIALS = {
  90005: 'Divine Amulet',
  90002: 'Dungeon Coins',
  90003: 'Arena Coins',
  90004: 'Princess Arena Coins',
  90006: 'Clan Coins',
  90008: 'Master Coins',
  90007: 'Rupies',

  20001: 'Mini EXP Potion',
  20002: 'EXP Potion',
  20003: 'Super EXP Potion',
  20004: 'Mega EXP Potion',
  20005: 'Giga EXP Potion',

  22001: 'Refinement Crystal',
  22002: 'Enhanced Refinement Crystal',
  22003: 'Superior Refinement Crystal',

  // "21900": "Growth Sphere 180",
  // "21901": "Growth Sphere 215",
  // "21902": "Growth Sphere 250",
  // "21903": "Growth Sphere 100",

  25001: 'Princess Orb',
};

const NOTABLE_EQUIPMENTS = {
  140000: 'Princess Heart',
  140001: 'Princess Heart (Fragment)',
};

// Parses response body (from ingame / lambda) for material data
const parseMaterialData = (resBody) => {
  const resultRows = [];

  // Add items
  for (const key in NOTABLE_MATERIALS) {
    const name = NOTABLE_MATERIALS[key];
    const amount = resBody.item_list.find((i) => i.id == key)?.stock || 0;

    resultRows.push({ name, amount });
  }

  // Add equipments
  for (const key in NOTABLE_EQUIPMENTS) {
    const name = NOTABLE_EQUIPMENTS[key];
    const amount = resBody.user_equip.find((i) => i.id == key)?.stock || 0;

    resultRows.push({ name, amount });
  }

  // Add specials
  resultRows.push({ name: 'Mana (Free)', amount: resBody.user_gold.gold_id_free });
  resultRows.push({ name: 'Jewel (Free)', amount: resBody.user_jewel.free_jewel });
  resultRows.push({ name: 'Account EXP', amount: resBody.user_info.team_exp });

  return resultRows;
};

// transformToTSV transforms raw ingame /load/index response body
// To tab-separated values which can be pasted into spreadsheet nicely
const transformToTSV = (resBody) => {
  const data = parseMaterialData(resBody);
  const tsv = data.forEach(row => {
    return [row.name, row.amount].join(TAB);
  });

  return tsv.join('\n');
};

// Actual plugin starts here
const handler = (req, rawRes) => {
  if (!global.config.Config.Configuration.ivKey) return;

  const res = Buffer.from(rawRes.toString('utf8'), 'base64');
  const resBody = decrypt(res);
  const tsv = transformToTSV(resBody);

  proxy.log({
    type: 'success',
    source: 'plugin',
    name: pluginName,
    clipboard: tsv,
  });
};

const init = (proxy, config) => {
  proxy.on('/load/index', handler);
};

module.exports = {
  defaultConfig,
  defaultConfigDetails,
  pluginName,
  pluginDescription,
  init,
};
