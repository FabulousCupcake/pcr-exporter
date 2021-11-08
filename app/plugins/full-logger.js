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
  deleteFileOnQuit: true,
  dumpRaw: false,
  dumpDecrypted: true,
  logDecryptedRequest: false,
  logDecryptedResponse: true,
};
const defaultConfigDetails = {
  deleteFileOnQuit: { label: 'Delete log file before quitting app' },
  dumpRaw: { label: 'Dump raw, unencrypted request and response body' },
  dumpDecrypted: { label: 'Dump decrypted request and response body' },
  logDecryptedRequest: { label: 'Print decrypted request body in Logs page' },
  logDecryptedResponse: { label: 'Print decrypted response body in Logs page' },
};
const cfg = config.Config.Plugins[pluginName];

const RAW_LOG_FILENAME = 'raw_log.txt';
const DECRYPTED_LOG_FILENAME = 'log.txt';

// Actual plugin starts here
const log = (filename, endpoint, req, res) => {
  const logfile = fs.createWriteStream(path.join(config.Config.Preferences.filesPath, filename), {
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

// decrypt attempts to decrypt the traffic with the obtained
const decrypt = (data) => {
  const aesBody = data.subarray(0, data.length - 32);
  const aesKey = data.subarray(data.length - 32, data.length);
  const ivKey = Buffer.from(global.config.Config.Configuration.ivKey, 'utf8');

  const rawBody = new aesjs.ModeOfOperation.cbc(aesKey, ivKey).decrypt(aesBody);
  const body = rawBody.subarray(0, rawBody.length - rawBody[rawBody.length - 1]);
  const msgpack = msgpack5().decode(body);
  return msgpack;
};

// logDecrypted attempst to decrypt and print/dump the results
const logDecrypted = (endpoint, req, rawRes) => {
  const res = Buffer.from(rawRes.toString('utf8'), 'base64');

  try {
    const reqBody = decrypt(req);
    if (cfg.logDecryptedRequest) {
      proxy.log({
        type: 'info',
        source: 'plugin',
        name: pluginName,
        message: `send: <pre>${JSON.stringify(reqBody, null, 2)}</pre>`,
        endpoint,
      });
    }

    const resBody = decrypt(res);
    if (cfg.logDecryptedResponse) {
      proxy.log({
        type: 'info',
        source: 'plugin',
        name: pluginName,
        message: `recv: <pre>${JSON.stringify(resBody, null, 2)}</pre>`,
        endpoint,
      });
    }

    if (!cfg.dumpDecrypted) return;
    log(DECRYPTED_LOG_FILENAME, endpoint, JSON.stringify(reqBody), JSON.stringify(resBody));
  } catch (err) {
    proxy.log({
      type: 'error',
      source: 'plugin',
      name: pluginName,
      message: `Failed decrypting ${endpoint}: ${err}`,
      endpoint,
    });
  }
};

// debugHandler handles `debug` proxy event
const debugHandler = (endpoint, req, res) => {
  if (cfg.enabled) {
    log(RAW_LOG_FILENAME, endpoint, req, res);

    if (!global.config.Config.Configuration.ivKey) return;
    if (cfg.dumpDecrypted || cfg.logDecryptedRequest || cfg.logDecryptedResponse) {
      logDecrypted(endpoint, req, res);
    }
  }
};

// quitHandler handels `will-quit` app event
const quitHandler = () => {
  if (cfg.deleteFileOnQuit) {
    fs.unlinkSync(path.join(config.Config.Preferences.filesPath, 'full_log.txt'));
  }
};

// init
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
