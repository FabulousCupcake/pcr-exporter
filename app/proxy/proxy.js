const EventEmitter = require('events');
const { app } = require('electron');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const net = require('net');
const url = require('url');
const uuidv4 = require('uuid/v4');
const Proxy = require('http-mitm-proxy');
const { differenceInMonths } = require('date-fns');

const { promisify } = require('util');
const sleep = promisify(setTimeout);

const CERT_MAX_LIFETIME_IN_MONTHS = 24;
const API_HOST = 'priconne-redive.us';

class SWProxy extends EventEmitter {
  constructor() {
    super();
    this.ivKey = '';
    this.httpServer = null;
    this.proxy = null;
    this.logEntries = [];
    this.addresses = [];
  }
  async start(port) {
    const self = this;
    this.proxy = Proxy();

    this.proxy.onError(function (ctx, e, errorKind) {
      if (e.code === 'EADDRINUSE') {
        self.log({ type: 'warning', source: 'proxy', message: 'Port is in use from another process. Try another port.' });
      }
    });

    this.proxy.onRequest(function (ctx, callback) {
      if (ctx.clientToProxyRequest.headers.host !== API_HOST) {
        return callback(); // Not pricon, don't care
      }

      // Automatically decompress if gzipped
      ctx.use(Proxy.gunzip);

      // Need to manually collect request body
      // Under ctx since this function will be called multiple times
      //   and ctx persists for this specific connection
      ctx.reqChunks = [];
      ctx.onRequestData(function (ctx, chunk, callback) {
        ctx.reqChunks.push(chunk);
        return callback(null, chunk);
      });

      // Same with response
      ctx.resChunks = [];
      ctx.onResponseData(function (ctx, chunk, callback) {
        ctx.resChunks.push(chunk);
        return callback(null, chunk);
      });

      // When request is fully finished, we can start reading them
      ctx.onResponseEnd(function (ctx, callback) {
        const endpoint = ctx.clientToProxyRequest.url;
        const reqRaw = Buffer.concat(ctx.reqChunks);
        const resRaw = Buffer.concat(ctx.resChunks);

        self.emit('debug', endpoint, reqRaw, resRaw);
        self.emit(endpoint, reqRaw, resRaw);

        return callback();
      });

      return callback();
    });

    this.proxy.listen({ host: '::', port, sslCaDir: path.join(app.getPath('userData'), 'swcerts') }, async (e) => {
      this.log({ type: 'info', source: 'proxy', message: `Now listening on port ${port}` });
      const expired = await this.checkCertExpiration();

      if (expired) {
        this.log({
          type: 'warning',
          source: 'proxy',
          message: `Your certificate is older than ${CERT_MAX_LIFETIME_IN_MONTHS} months. If you experience connection issues, please regenerate a new one via the Settings.`,
        });
      }
    });

    if (process.env.autostart) {
      console.log(`Priconne Exporter Proxy is listening on port ${port}`);
    }
    win.webContents.send('proxyStarted');
  }

  async stop() {
    this.proxy.close();
    this.proxy = null;
    win.webContents.send('proxyStopped');
    this.log({ type: 'info', source: 'proxy', message: 'Proxy stopped' });
  }

  getInterfaces() {
    this.addresses = [];
    const interfaces = os.networkInterfaces();
    for (const k in interfaces) {
      for (const k2 in interfaces[k]) {
        const address = interfaces[k][k2];
        if (address.family === 'IPv4' && !address.internal) {
          this.addresses.push(address.address);
        }
      }
    }
    return this.addresses;
  }

  async checkCertExpiration() {
    const certPath = path.join(app.getPath('userData'), 'swcerts', 'certs', 'ca.pem');
    const certExists = await fs.pathExists(certPath);
    if (certExists) {
      const certInfo = await fs.stat(certPath);

      return differenceInMonths(new Date(), certInfo.ctime) >= CERT_MAX_LIFETIME_IN_MONTHS;
    } else {
      return false;
    }
  }

  async copyCertToPublic() {
    const fileExists = await fs.pathExists(path.join(app.getPath('userData'), 'swcerts', 'certs', 'ca.pem'));

    if (fileExists) {
      const copyPath = path.join(global.config.Config.Preferences.filesPath, 'cert', 'ca.pem');
      await fs.copy(path.join(app.getPath('userData'), 'swcerts', 'certs', 'ca.pem'), copyPath);
      this.log({
        type: 'success',
        source: 'proxy',
        message: `Certificate copied to ${copyPath}.`,
      });
    } else {
      this.log({
        type: 'info',
        source: 'proxy',
        message: 'No certificate available yet. You might have to start the proxy once and then try again.',
      });
    }
  }

  async reGenCert() {
    await fs.emptyDir(path.join(app.getPath('userData'), 'swcerts'));
    if (this.isRunning()) {
      await this.stop();
    }

    await this.start(process.env.port || config.Config.Configuration.port);
    // make sure the root cert was generated
    await sleep(1000);
    await this.copyCertToPublic();
  }

  isRunning() {
    if (this.proxy) {
      return true;
    }
    return false;
  }

  log(entry) {
    if (!entry) {
      return;
    }

    // add unique id for performance reasons
    entry.id = uuidv4();

    entry.date = new Date().toLocaleTimeString();
    this.logEntries = [entry, ...this.logEntries];

    const maxLogEntries = parseInt(config.Config.Preferences.maxLogEntries) || 0;
    if (this.logEntries.length > maxLogEntries && maxLogEntries !== 0) {
      this.logEntries.pop();
    }

    win.webContents.send('logupdated', this.logEntries);
  }

  getLogEntries() {
    return this.logEntries;
  }

  clearLogs() {
    this.logEntries = [];
    win.webContents.send('logupdated', this.logEntries);
  }
}

module.exports = SWProxy;
