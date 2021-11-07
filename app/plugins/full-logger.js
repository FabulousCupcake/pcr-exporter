const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const eol = require('os').EOL;

// Plugin Metadata
const pluginName = 'Full Logger';
const pluginDescription = 'Dumps data for every API event into a file';
const defaultConfig = {
  enabled: false,
  deleteFileOnQuit: false,
};
const defaultConfigDetails = {
  deleteFileOnQuit: { label: 'Delete log file before quitting app' },
};

// Actual plugin starts here
const log = (endpoint, req, res) => {
  let logfile = fs.createWriteStream(path.join(config.Config.App.filesPath, 'full_log.txt'), {
    flags: 'a',
    autoClose: true,
  });

  logfile.write(`
=============================================
${endpoint} - ${Date()}
--» SEND «-----------------------------------
${JSON.stringify(btoa(req))}
--» RECV «-----------------------------------
${JSON.stringify(btoa(res))}
=============================================`);
  logfile.end();
};

const debugHandler = (endpoint, req, res) => {
  if (config.Config.Plugins[pluginName].enabled) {
    log(endpoint, req, res);
    proxy.log({
      type: 'debug',
      source: 'plugin',
      name: pluginName,
      message: `${endpoint}: sent ${req.length} / recv ${res.length}`,
    });
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
