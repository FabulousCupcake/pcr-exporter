import React from 'react';

import { Button, Confirm, Grid, Header, Form, Icon, Popup, Segment } from 'semantic-ui-react';
import SettingsPlugin from '../components/SettingsPlugin';
import SettingsItem from '../components/SettingsItem';

const { ipcRenderer } = require('electron');
const remote = require('@electron/remote');

const { dialog } = remote;
const plugins = remote.getGlobal('plugins');
let config = remote.getGlobal('config');

class Preferences extends React.Component {
  constructor() {
    super();
    this.state = {
      filesPath: config.Config.Preferences.filesPath,
    };
  }

  openDialog(e) {
    e.preventDefault();
    dialog
      .showOpenDialog({
        properties: ['openDirectory'],
      })
      .then((result) => {
        if (!result.canceled) {
          this.setState({ filesPath: result.filePaths.toString() });
          config.Config.Preferences.filesPath = result.filePaths.toString();
          ipcRenderer.send('updateConfig');
        }
      });
  }

  openCertCinfirmDialog() {
    this.setState({ confirmCertDialog: true });
  }

  handleCertConfirm() {
    ipcRenderer.send('reGenCert');
    this.setState({ confirmCertDialog: false });
  }

  handleCertCancel() {
    this.setState({ confirmCertDialog: false });
  }

  render() {
    const folderLocations = ipcRenderer.sendSync('getFolderLocations');
    return (
      <React.Fragment>
        <Header as="h1">Preferences</Header>
        <Form>
          <Form.Input
            label="Files Path"
            action={<Button class="ui button" content="Change" onClick={this.openDialog.bind(this)} />}
            value={this.state.filesPath}
            readOnly
            fluid
          />
          <Form.Input label="Settings Path" defaultValue={folderLocations.settings} fluid readOnly />
          <SettingsItem section="Preferences" setting="autoStart" type="checkbox" />
          <SettingsItem section="Preferences" setting="debug" type="checkbox" />
          <SettingsItem section="Preferences" setting="minimizeToTray" type="checkbox" />
          <SettingsItem section="Preferences" setting="clearLogOnLogin" type="checkbox" />
          <SettingsItem section="Preferences" setting="maxLogEntries" type="input" />
        </Form>
      </React.Fragment>
    );
  }
}

module.exports = Preferences;
