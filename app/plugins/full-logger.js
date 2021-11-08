const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const aesjs = require('aes-js');
const msgpack5 = require('msgpack5');

// Plugin Metadata
const pluginName = 'Full Logger';
const pluginDescription = 'Dumps data for every API event into a file';
const defaultConfig = {
  enabled: false,
  deleteFileOnQuit: false,
  dumpRaw: false,
  logDecryptedRequest: false,
};
const defaultConfigDetails = {
  deleteFileOnQuit: { label: 'Delete log file before quitting app' },
  dumpRaw: { label: 'Always dump raw, undecrypted data' },
  logDecryptedRequest: { label: 'Only log decrypted response body' },
};

const RAW_LOG_FILENAME = 'raw_log.txt';
const DECRYPTED_LOG_FILENAME = 'log.txt';

// Actual plugin starts here
const log = (filename, endpoint, req, res) => {
  const logfile = fs.createWriteStream(path.join(config.Config.App.filesPath, filename), {
    flags: 'a',
    autoClose: true,
  });

  logfile.write(`
=============================================
${endpoint} - ${Date()}
--» SEND «-----------------------------------
${JSON.stringify(req)}
--» RECV «-----------------------------------
${JSON.stringify(res)}
=============================================`);
  logfile.end();
};

// Decrypt attempts to decrypt the traffic with the obtained
const decrypt = data => {
  const aesBody = data.subarray(0, data.length - 32);
  const aesKey = data.subarray(data.length - 32, data.length);
  const ivKey = Buffer.from(global.config.Config.Configuration.ivKey, "utf8");

  const rawBody = new aesjs.ModeOfOperation.cbc(aesKey, ivKey).decrypt(aesBody);
  const body = rawBody.subarray(0, rawBody.length - rawBody[rawBody.length - 1]);
  const msgpack = msgpack5().decode(body);
  return msgpack;
};

const logDecrypted = (endpoint, req, rawRes) => {
  const res = Buffer.from(rawRes.toString('utf8'), 'base64');

  try {
    const reqBody = decrypt(req);
    if (global.config.Config.Plugins.logDecryptedRequest) {
      proxy.log({
        type: 'info',
        source: 'plugin',
        name: pluginName,
        message: `send: <Segment piled><code>${endpoint}</code><pre>${JSON.stringify(reqBody)}</pre></Segment>`,
      });
    }

    const resBody = decrypt(res);
    proxy.log({
      type: 'info',
      source: 'plugin',
      name: pluginName,
      message: `recv: <code>${endpoint}</code><pre>${JSON.stringify(resBody)}</pre>`,
    });
    log(DECRYPTED_LOG_FILENAME, endpoint, reqBody, resBody)
  } catch (err) {
    proxy.log({
      type: 'error',
      source: 'plugin',
      name: pluginName,
      message: `Failed decrypting ${endpoint}: ${err}`,
    });
  }
};

const debugHandler = (endpoint, req, res) => {
  if (config.Config.Plugins[pluginName].enabled) {
    log(RAW_LOG_FILENAME, endpoint, req, res);

    if (global.config.Config.Preferences.debug) {
      proxy.log({
        type: 'debug',
        source: 'plugin',
        name: pluginName,
        message: `${endpoint}: sent ${req.length} / recv ${res.length}`,
      });
    }

    if (global.config.Config.Plugins.dumpRaw) return;
    if (!global.config.Config.Configuration.ivKey) return;
    logDecrypted(endpoint, req, res);
  }
};

const quitHandler = () => {
  if (config.Config.Plugins[pluginName].deleteFileOnQuit) {
    fs.unlinkSync(path.join(config.Config.App.filesPath, 'full_log.txt'));
  }
};

const init = (proxy, config) => {
  proxy.on('debug', debugHandler);
  app.on('will-quit', quitHandler);
};

module.exports = {
  defaultConfig,
  defaultConfigDetails,
  pluginName,
  pluginDescription,
  init,
};

function btoa(shit) {
  return Buffer.from(shit).toString('base64');
}
