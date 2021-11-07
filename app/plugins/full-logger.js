const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const eol = require('os').EOL;

module.exports = {
  defaultConfig: {
    enabled: false,
    deleteFileOnQuit: false,
  },
  defaultConfigDetails: {
    deleteFileOnQuit: { label: 'Delete log file before quitting app' },
  },
  pluginName: 'FullLogger',
  pluginDescription: 'Dumps data for every API event into a file.',
  init(proxy, config) {
    proxy.on('debug', (endpoint, req, res) => {
      if (config.Config.Plugins[this.pluginName].enabled) {
        this.logCommand(endpoint, req, res);
        proxy.log({
          type: 'debug',
          source: 'plugin',
          name: this.pluginName,
          message: `${endpoint}: sent ${req.length} / recv ${res.length}`,
        });
      }
    });
    app.on('will-quit', () => {
      if (config.Config.Plugins[this.pluginName].deleteFileOnQuit) {
        fs.unlinkSync(path.join(config.Config.App.filesPath, 'full_log.txt'));
      }
    });
  },
  logCommand(endpoint, req, res) {
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
  },
};

function btoa(shit) {
  return Buffer.from(shit).toString('base64');
}
