// Plugin Metadata
const defaultConfig = { enabled: false };
const defaultConfigDetails = {};
const pluginName = 'ExamplePlugin';
const pluginDescription = 'This plugin shows you all API events in the log';

// Actual plugin starts here
const processEveryCommand = (proxy, req) => {
  proxy.log({ type: 'info', source: 'plugin', name: this.pluginName, message: `Found API Command ${req.command}` });
};

const hubUserLoginHandler = () => {
  if (config.Config.Plugins[this.pluginName].enabled) {
    proxy.log({ type: 'info', source: 'plugin', name: this.pluginName, message: 'You just logged into the game.' });
  }
};

const handler = (req, res) => {
  if (config.Config.Plugins[this.pluginName].enabled) {
    processEveryCommand(proxy, req, resp);
  }
};

const init = (proxy, config) => {
  // Subscribe to api command events from the proxy here.
  // You can subscribe to specifc API commands. Event name is the same as the command string
  proxy.on('HubUserLogin', hubUserLoginHandler);

  // or all API commands with the 'apiCommand' event
  proxy.on('apiCommand', handler);
};

module.exports = {
  defaultConfig,
  defaultConfigDetails,
  pluginName,
  pluginDescription,
  init,
};
