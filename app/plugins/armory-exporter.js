const decrypt = require('./lib/decrypt');
const zlib = require('zlib');

// Plugin Metadata
const defaultConfig = { enabled: true, targetRankSource: '' };
const defaultConfigDetails = {
  targetRankSource: {
    type: 'textarea',
    label: 'Put your armory export text here and it will be used to preserve the unit target rank',
  },
};
const pluginName = 'Armory Exporter';
const pluginDescription = 'Exports unit and equipment data to be pcredivewiki.tw armory import text serialization fomat';
const cfg = config.Config.Plugins[pluginName];

// Equip Type Enum
const EQUIP = 0;
const FRAGMENT = 1;
const BLUEPRINT = 2;
const UNIQUE_EQ = 3;
const P_HEART = 4;
const EQUIP_TYPE_MAP = [EQUIP, FRAGMENT, BLUEPRINT, UNIQUE_EQ, P_HEART];

// Equip Rarity Enum
const HEART = 0;
const BLUE = 1;
const BRONZE = 2;
const SILVER = 3;
const GOLD = 4;
const PURPLE = 5;
const RED = 6;
const GREEN = 7;
const EQUIP_RARITY_MAP = [HEART, BLUE, BRONZE, SILVER, GOLD, PURPLE, RED, GREEN];

// fetchTargetData returns a simple id:target map from an exportText data
const parseTargetData = (exportText) => {
  const text = Buffer.from(exportText, 'base64');
  const data = zlib.gunzipSync(text).toString('utf8');
  const json = JSON.parse(data);
  const units = json[0];

  const targetRankMap = {};
  units.forEach((u) => {
    targetRankMap[u.u] = u.t;
  });

  return targetRankMap;
};

// transformUnitList transforms ingame .data.unit_list to armory serialized list
const transformUnitList = (units) => {
  const convertId = (id) => parseInt(id / 100).toString(16);
  const convertEq = (eq) => eq.reduce((a, b) => a + b.is_slot, '');

  // Try to preserve target rank if there are any
  const targetData = cfg.targetRankSource ? parseTargetData(cfg.targetRankSource) : {};

  const result = units.map((u) => ({
    u: convertId(u.id),
    e: convertEq(u.equip_slot),
    r: u.unit_rarity,
    p: u.promotion_level,
    q: u.unique_equip_slot[0]?.enhancement_level || 0,
    t: targetData[convertId(u.id)] || false,
  }));

  // Find all target units the user does not own
  // These should be retained, with the unit data set to all minimum (rank 1, level 1, …)
  Object.keys(targetData).filter(t => !result.find(u => u.u == t)).forEach(t => {
    result.push({
      u: t,
      e: "000000",
      r: 3,
      p: 1,
      q: 0,
      t: targetData[t],
    });
  });
  
  return result;
};

// transformEquipList transforms ingame .data.equip_list to armory serialized list
// reference implementation: https://github.com/Xiaodx912/chika/blob/1b1c55b45208f984b91c3872eff9abeb63059ca8/chika.py#L100
const transformEquipList = (equips) => {
  const toHex = (id) => id.toString(16);

  const result = [];
  equips.forEach((e) => {
    const id = e.id.toString();
    const type = EQUIP_TYPE_MAP[id.substr(1, 1)];
    const rarity = EQUIP_RARITY_MAP[id.substr(2, 1)];

    if (type === EQUIP) return;
    if (rarity === BLUE) return;
    if (rarity === BRONZE) return;
    if (type === UNIQUE_EQ) return;

    result.push({
      e: toHex(e.id),
      c: toHex(e.stock),
      a: e.stock > 0 ? '1' : '0',
    });
  });

  // Special handling needed for princess hearts
  const hearts = equips.find((e) => e.id === 140000)?.stock || 0;
  const heartFragments = equips.find((e) => e.id === 140001)?.stock || 0;
  const totalHeartFragments = heartFragments + hearts * 10;
  result.push({
    e: toHex(140001),
    c: toHex(totalHeartFragments),
    a: totalHeartFragments > 0 ? '1' : '0',
  });

  // We _could_ parse all equipments here and convert it into their base material cost
  // But that's too much work, fuck it

  return result;
};

// transformToArmorySerializationText transforms raw ingame /load/index response body
// To import text format that can be loaded to pcredivewiki.tw/armory
const transformToArmorySerializationText = (resBody) => {
  const unit = transformUnitList(resBody.data.unit_list);
  const equip = transformEquipList(resBody.data.user_equip);

  const data = JSON.stringify([unit, equip]);
  const importText = zlib.gzipSync(data).toString('base64');

  return importText;
};

// Actual plugin starts here
const handler = (req, rawRes) => {
  if (!global.config.Config.Configuration.ivKey) return;

  const res = Buffer.from(rawRes.toString('utf8'), 'base64');
  const resBody = decrypt(res);
  const importText = transformToArmorySerializationText(resBody);

  proxy.log({
    type: 'success',
    source: 'plugin',
    name: pluginName,
    clipboard: importText,
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
