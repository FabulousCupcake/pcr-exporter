import React from 'react';
import { Form } from 'semantic-ui-react';
import SettingsItem from './SettingsItem';

const remote = require('@electron/remote');

let config = remote.getGlobal('config');

class SettingsPlugin extends React.Component {
  constructor() {
    super();
  }

  render() {
    const cfg = config.Config.Plugins[this.props.pluginName];
    const cfgDet = config.ConfigDetails.Plugins[this.props.pluginName];

    const pluginConfigElement = Object.keys(cfg).map((key, i) => {
      const inputType = cfgDet?.[key]?.type || 'checkbox';

      return (
        <Form.Field key={i}>
          <SettingsItem section="Plugins" pluginName={this.props.pluginName} setting={key} type={inputType} />
        </Form.Field>
      );
    });
    return <Form>{pluginConfigElement}</Form>;
  }
}

module.exports = SettingsPlugin;
