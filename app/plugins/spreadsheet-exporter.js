const decrypt = require('./lib/decrypt');

// Plugin Metadata
const defaultConfig = { enabled: true };
const defaultConfigDetails = {};
const pluginName = 'Spreadsheet Exporter';
const pluginDescription = 'Exports unit data into tab-separated values format that can be pasted into spreadsheets';

// Tab character…
const TAB = '	';

// transformToTSV transforms raw ingame /load/index response body
// To tab-separated values which can be pasted into spreadsheet nicely
const transformToTSV = (resBody) => {
  const fetchBondLevel = (readStoryIds, charId) => {
    return readStoryIds
      .map((id) => id.toString())
      .filter((id) => id.substr(0, 4) == charId)
      .map((id) => parseInt(id.substr(4, 3), 10))
      .reduce((a, b) => Math.max(a, b), 0);
  };

  const fetchShardAmount = (charId) => resBody.item_list.find((i) => i.id == `3${charId}`)?.stock || 0;
  const normalizeEquipRefineLevel = (eq) => (!eq.is_slot ? -1 : eq.enhancement_level);

  const units = resBody.unit_list;
  const readStoryIds = resBody.read_story_ids;

  const tsv = units.map((u) => {
    const id = u.id.toString().substr(0, 4);
    const level = u.unit_level;
    const star = u.unit_rarity;
    const shard = fetchShardAmount(id);
    const rank = u.promotion_level;
    const eq1 = normalizeEquipRefineLevel(u.equip_slot[0]);
    const eq2 = normalizeEquipRefineLevel(u.equip_slot[1]);
    const eq3 = normalizeEquipRefineLevel(u.equip_slot[2]);
    const eq4 = normalizeEquipRefineLevel(u.equip_slot[3]);
    const eq5 = normalizeEquipRefineLevel(u.equip_slot[4]);
    const eq6 = normalizeEquipRefineLevel(u.equip_slot[5]);
    const ub = u.union_burst[0].skill_level;
    const sk1 = u.main_skill?.[0]?.skill_level || 0;
    const sk2 = u.main_skill?.[1]?.skill_level || 0;
    const ex = u.ex_skill?.[0]?.skill_level || 0;
    const ue = u.unique_equip_slot[0]?.enhancement_level || 0;
    const bond = fetchBondLevel(readStoryIds, id);

    // prettier-ignore
    const columns = [
      id,
      level,
      star,
      shard,
      rank,
      eq1,
      eq2,
      eq3,
      eq4,
      eq5,
      eq6,
      ub,
      sk1,
      sk2,
      ex,
      ue,
      bond,
    ];
    return columns.join(TAB);
  });

  return tsv.join('\n');
};

// Actual plugin starts here
const handler = (req, rawRes) => {
  if (!global.config.Config.Configuration.ivKey) return;

  const res = Buffer.from(rawRes.toString('utf8'), 'base64');
  const resBody = decrypt(res).data;
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
