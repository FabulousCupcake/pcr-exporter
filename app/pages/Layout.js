import React from 'react';
import { withRouter } from 'react-router-dom';

import { Segment, Menu, Icon, Button, Container } from 'semantic-ui-react';
import Mousetrap from 'mousetrap';

import Head from '../components/Head';

const appVersion = require('@electron/remote').app.getVersion();

class Layout extends React.Component {
  constructor() {
    super();
    this.state = { activeItem: 'logs', compactMode: false };
    this.toggleCompactMode = this.toggleCompactMode.bind(this);

    Mousetrap.bind(['command+1', 'alt+1'], () => {
      this.navigate('/', 'logs');
    });

    Mousetrap.bind(['command+2', 'alt+2'], () => {
      this.navigate('config', 'config');
    });

    Mousetrap.bind(['command+3', 'alt+3'], () => {
      this.navigate('preferences', 'preferences');
    });

    Mousetrap.bind(['command+b', 'ctrl+b'], () => {
      this.toggleCompactMode();
    });
  }

  navigate(path, name) {
    this.props.history.push(path);
    this.setState({ activeItem: name });
  }

  navigateFromElement(e, element) {
    this.navigate(element['data-path'], element.name);
  }

  toggleCompactMode() {
    this.setState({ compactMode: !this.state.compactMode });
  }

  render() {
    return (
      <div>
        {this.state.compactMode ? null : <Head />}
        {this.state.compactMode ? null : (
          <Menu fixed="left" vertical inverted width="thin" className="side-menu">
            <Menu.Item name="logs" link active={this.state.activeItem === 'logs'} data-path="/" onClick={this.navigateFromElement.bind(this)}>
              <Icon name="file alternate" />
              Logs
            </Menu.Item>
            <Menu.Item
              name="config"
              link
              active={this.state.activeItem === 'config'}
              data-path="config"
              onClick={this.navigateFromElement.bind(this)}
            >
              <Icon name="configure" />
              Configuration
            </Menu.Item>
            <Menu.Item
              name="preferences"
              link
              active={this.state.activeItem === 'preferences'}
              data-path="preferences"
              onClick={this.navigateFromElement.bind(this)}
            >
              <Icon name="paint brush" />
              Preferences
            </Menu.Item>
            <span id="version">v{appVersion}</span>
          </Menu>
        )}

        <Segment basic className={this.state.compactMode ? 'compacted main-content' : 'main-content'}>
          <div class="compact-button">
            <Button class="button ui" compact icon={this.state.compactMode ? 'expand' : 'compress'} onClick={this.toggleCompactMode} />
          </div>
          <div class="content-area">{this.props.children}</div>
        </Segment>
      </div>
    );
  }
}

module.exports = withRouter(Layout);
