const { app, BrowserWindow, ipcMain, Menu, shell, Tray } = require('electron');
require('@electron/remote/main').initialize();
const fs = require('fs-extra');
const storage = require('electron-json-storage');
const windowStateKeeper = require('electron-window-state');
const _ = require('lodash');
const Proxy = require('./proxy/proxy');

const path = require('path');
const url = require('url');

const iconPath = path.join(process.resourcesPath, 'icon.ico');

global.appVersion = app.getVersion();

let defaultFilePath = path.join(app.getPath('desktop'), `${app.name} Files`);
let defaultConfig = {
  Config: {
    Preferences: {
      filesPath: defaultFilePath,
      debug: false,
      clearLogOnLogin: false,
      maxLogEntries: 100,
      minimizeToTray: false,
    },
    Configuration: {
      ivKey: '',
      port: 8080,
      autoStart: false,
    },
    Plugins: {},
  },
};
let defaultConfigDetails = {
  ConfigDetails: {
    Preferences: {
      autoStart: { label: 'Start proxy automatically' },
      clearLogOnLogin: { label: 'Clear Log on every login' },
      debug: { label: 'Show Debug Messages' },
      maxLogEntries: { label: 'Maximum amount of log entries' },
      minimizeToTray: { label: 'Minimize to system tray' },
    },
    Plugins: {},
  },
};

function createWindow() {
  let mainWindowState = windowStateKeeper({
    defaultWidth: 1024,
    defaultHeight: 768,
  });

  global.win = new BrowserWindow({
    minWidth: 830,
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    acceptFirstMouse: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      // TODO: remote will be removed with electron 13, so this should be migrated to ipcRenderer.invoke at some point
      enableRemoteModule: true,
      contextIsolation: false,
    },
  });

  global.mainWindowId = win.id;

  function restoreWindowFromSystemTray() {
    global.win.show();
    if (bounds) {
      global.win.setBounds(bounds);
      bounds = undefined;
    }
  }

  let appIcon = null;
  let bounds = undefined;
  app.whenReady().then(() => {
    const iconExists = fs.existsSync(iconPath);
    appIcon = new Tray(iconExists ? iconPath : './app/assets/icon.ico');
    appIcon.on('double-click', restoreWindowFromSystemTray);
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show',
        click: restoreWindowFromSystemTray,
      },
      {
        label: 'Quit',
        click: function () {
          app.quit();
        },
      },
    ]);

    appIcon.setContextMenu(contextMenu);
  });

  global.win.on('minimize', function (event) {
    if (!config.Config.Preferences.minimizeToTray) return;

    event.preventDefault();
    bounds = global.win.getBounds();
    global.win.hide();
  });

  win.loadURL(
    url.format({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file:',
      slashes: true,
    })
  );

  mainWindowState.manage(win);

  require('@electron/remote/main').enable(win.webContents);

  win.webContents.on('new-window', (e, link) => {
    e.preventDefault();
    shell.openExternal(link);
  });
}

function initProxy() {
  const proxy = new Proxy();
  global.proxy = proxy;

  proxy.on('error', () => {});

  ipcMain.on('proxyIsRunning', (event) => {
    event.returnValue = proxy.isRunning();
  });

  ipcMain.on('proxyGetInterfaces', (event) => {
    event.returnValue = proxy.getInterfaces();
  });

  ipcMain.on('proxyStart', () => {
    proxy.start(config.Config.Configuration.port);
  });

  ipcMain.on('proxyStop', () => {
    proxy.stop();
  });

  ipcMain.on('getCert', async () => {
    await proxy.copyCertToPublic();
  });

  ipcMain.on('reGenCert', async () => {
    await proxy.reGenCert();
  });

  ipcMain.on('logGetEntries', (event) => {
    event.returnValue = proxy.getLogEntries();
  });

  ipcMain.on('updateConfig', () => {
    storage.set('Config', config.Config, (error) => {
      if (error) throw error;
    });
  });

  ipcMain.on('getFolderLocations', (event) => {
    event.returnValue = {
      settings: app.getPath('userData'),
    };
  });
}

global.plugins = [];

function loadPlugins() {
  // Initialize Plugins
  let plugins = [];

  const pluginDirs = [path.join(__dirname, 'plugins'), path.join(global.config.Config.Preferences.filesPath, 'plugins')];

  // Load each plugin module in the folder
  pluginDirs.forEach((dir) => {
    const filteredPlugins = fs.readdirSync(dir).filter((item) => !/(^|\/)\.[^\/\.]/g.test(item));
    filteredPlugins.forEach((file) => {
      if (file.substr(-2) !== 'js') return;
      const plug = require(path.join(dir, file));

      // Check plugin for correct shape
      if (plug.defaultConfig && plug.pluginName && plug.pluginDescription && typeof plug.init === 'function') {
        plugins.push(plug);
      } else {
        global.proxy.log({
          type: 'error',
          source: 'proxy',
          message: `Invalid plugin ${file}. Missing one or more required module exports.`,
        });
      }
    });
  });

  // Initialize plugins
  plugins.forEach((plug) => {
    // try to parse JSON for textareas
    config.Config.Plugins[plug.pluginName] = _.merge(plug.defaultConfig, config.Config.Plugins[plug.pluginName]);
    Object.entries(config.Config.Plugins[plug.pluginName]).forEach(([key, value]) => {
      if (
        plug.defaultConfigDetails &&
        plug.defaultConfigDetails[key] &&
        plug.defaultConfigDetails[key].type &&
        plug.defaultConfigDetails[key].type === 'textarea'
      ) {
        try {
          const parsedValue = JSON.parse(value);
          config.Config.Plugins[plug.pluginName][key] = parsedValue;
        } catch (error) {
          // JSON parsing didn't work, do nothing
        }
      }
    });
    config.ConfigDetails.Plugins[plug.pluginName] = plug.defaultConfigDetails || {};
    try {
      plug.init(global.proxy, config);
    } catch (error) {
      global.proxy.log({
        type: 'error',
        source: 'proxy',
        message: `Error initializing ${plug.pluginName}: ${error.message}`,
      });
    }
  });

  return plugins;
}

app.on('ready', () => {
  initProxy();

  app.setAppUserModelId(process.execPath);
  createWindow();

  if (process.platform === 'darwin') {
    // Create our menu entries so that we can use MAC shortcuts like copy & paste
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        {
          label: 'Edit',
          submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { role: 'pasteandmatchstyle' },
            { role: 'delete' },
            { role: 'selectall' },
          ],
        },
      ])
    );
  }

  storage.getAll((error, data) => {
    if (error) throw error;

    global.config = _.merge(defaultConfig, data);
    global.config.ConfigDetails = defaultConfigDetails.ConfigDetails;

    fs.ensureDirSync(global.config.Config.Preferences.filesPath);
    fs.ensureDirSync(path.join(global.config.Config.Preferences.filesPath, 'plugins'));

    global.plugins = loadPlugins();

    if (process.env.autostart || global.config.Config.Preferences.autoStart) {
      global.proxy.start(process.env.port || config.Config.Preferences.port);
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});
