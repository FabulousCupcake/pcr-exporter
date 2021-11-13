const decrypt = require('./lib/decrypt');

const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const eol = require('os').EOL;
const aesjs = require('aes-js');

// Plugin Metadata
const defaultConfig = { enabled: true };
const defaultConfigDetails = {};
const pluginName = 'IV Extractor';
const pluginDescription = 'Extracts IV key necessary to read the traffic data using Known-Plaintext Attack';

// Actual plugin starts here
// The following is known first 16 bytes of /check/check_agreement response body
const knownBody = [130, 172, 100, 97, 116, 97, 95, 104, 101, 97, 100, 101, 114, 115, 133, 170];
const noopIV = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];

const handler = (req, rawRes) => {
  if (global.config.Config.Configuration.ivKey) {
    proxy.log({
      type: 'info',
      source: 'plugin',
      name: pluginName,
      message: `Already have IV Key! Not doing anything!`,
    });
    return;
  }

  // The response body is always utf8-encoded base64 ¯\_(ツ)_/¯
  const res = Buffer.from(rawRes.toString('utf8'), 'base64');
  const aesBody = res.subarray(0, res.length - 32);
  const aesKey = res.subarray(res.length - 32, res.length);
  const body = new aesjs.ModeOfOperation.cbc(aesKey, noopIV).decrypt(aesBody);

  const compareBody = body.subarray(0, 16);
  const ivArray = compareBody.map((v, k) => v ^ knownBody[k]);
  const ivRaw = Buffer.from(ivArray);
  const ivKey = ivRaw.toString('utf8');

  config.Config.Configuration.ivKey = ivKey;
  win.webContents.send('ivKeyObtained', ivKey);

  try {
    const reqBody = decrypt(req);
    proxy.log({
      type: 'debug',
      source: 'plugin',
      name: pluginName,
      message: `<pre>${reqBody}</pre>`,
    });
  } catch (err) {
    proxy.log({
      type: 'error',
      source: 'plugin',
      name: pluginName,
      message: `Obtained IV key <code>${ivKey}</code> but failed test decryption. Removing IV key.<br/>${err}`,
    });
    config.Config.Configuration.ivKey = '';
    win.webContents.send('ivKeyObtained', '');
    return;
  }

  proxy.log({
    type: 'success',
    source: 'plugin',
    name: pluginName,
    message: `Obtained IV key: <code>${ivKey}</code>`,
  });
};

const init = (proxy, config) => {
  proxy.on('/check/check_agreement', handler);
};

module.exports = {
  defaultConfig,
  defaultConfigDetails,
  pluginName,
  pluginDescription,
  init,
};
