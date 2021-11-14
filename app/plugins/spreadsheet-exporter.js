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
  const fetchShardAmount = (charId) => resBody.data.item_list.find((i) => i.id == `3${charId}`)?.stock || 0;
  const fetchBondLevel = (charId) => resBody.data.user_chara_info.find((i) => i.chara_id == charId)?.love_level || 0;

  const units = resBody.data.unit_list;
  const tsv = units.map((u) => {
    const id = u.id.toString().substr(0, 4);
    const level = u.unit_level;
    const star = u.unit_rarity;
    const shard = fetchShardAmount(id);
    const rank = u.promotion_level;
    const eq1 = u.equip_slot[0].enhancement_level || 0;
    const eq2 = u.equip_slot[1].enhancement_level || 0;
    const eq3 = u.equip_slot[2].enhancement_level || 0;
    const eq4 = u.equip_slot[3].enhancement_level || 0;
    const eq5 = u.equip_slot[4].enhancement_level || 0;
    const eq6 = u.equip_slot[5].enhancement_level || 0;
    const ub = u.union_burst[0].skill_level;
    const sk1 = u.main_skill?.[0]?.skill_level || 0;
    const sk2 = u.main_skill?.[1]?.skill_level || 0;
    const ex = u.ex_skill?.[0]?.skill_level || 0;
    const ue = u.unique_equip_slot[0]?.enhancement_level || 0;
    const bond = fetchBondLevel(id);

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
