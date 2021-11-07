import React from 'react';

import { Button, Confirm, Grid, Header, Form, Icon, Popup, Segment } from 'semantic-ui-react';
import SettingsPlugin from '../components/SettingsPlugin';
import SettingsItem from '../components/SettingsItem';

const { ipcRenderer } = require('electron');
const remote = require('@electron/remote');

const { dialog } = remote;
const plugins = remote.getGlobal('plugins');
let config = remote.getGlobal('config');

class Config extends React.Component {
  constructor() {
    super();
    this.state = {
      filesPath: config.Config.Configuration.ivKey,
      confirmCertDialog: false,
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
          config.Config.Configuration.filesPath = result.filePaths.toString();
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
    const pluginSettings = plugins.map((plugin, i) => {
      let description = plugin.pluginDescription ? (
        <Popup trigger={<Icon name="info circle" />} content={plugin.pluginDescription} size="small" />
      ) : (
        ''
      );

      return (
        <React.Fragment>
          <Header as="h4">
            {plugin.pluginName}
            {description}
          </Header>
          <SettingsPlugin pluginName={plugin.pluginName} />
        </React.Fragment>
      );
    });
    return (
      <React.Fragment>
        <Confirm
          content="Are you sure you want to regenerate the certificate? Devices which use the current cert will not be able to connect anymore. This can not be reverted!"
          open={this.state.confirmCertDialog}
          onCancel={this.handleCertCancel.bind(this)}
          onConfirm={this.handleCertConfirm.bind(this)}
        />
        <Header as="h2">Network</Header>
        <Form>
          <Form.Input
            label="IV Key"
            action={<Button class="ui button" content="Reset" onclick={'                        '} />}
            value={this.state.ivKey}
            placeholder="This will be filled automatically. Read Help for more details."
            readOnly
            fluid
          />
          <Button content="Regenerate Cert" icon="refresh" size="small" labelPosition="left" onClick={this.openCertCinfirmDialog.bind(this)} />
        </Form>

        <Header as="h2">Plugins</Header>
        {pluginSettings}
      </React.Fragment>
    );
  }
}

module.exports = Config;
