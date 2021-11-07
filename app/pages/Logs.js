import React from 'react';
import { Header, Feed, Divider, Label } from 'semantic-ui-react';
import { capitalize, toLower } from 'lodash/string';

const { ipcRenderer } = require('electron');
const remote = require('@electron/remote');

const config = remote.getGlobal('config');

class Logs extends React.Component {
  constructor() {
    super();
    this.state = { entries: [] };
  }

  componentDidMount() {
    ipcRenderer.on('logupdated', (event, message) => {
      this.update(message);
    });
    this.setState({ entries: ipcRenderer.sendSync('logGetEntries') });
  }

  componentWillUnmount() {
    ipcRenderer.removeAllListeners('logupdated');
  }

  update(entries) {
    this.setState({ entries });
  }

  labelColor(logType) {
    switch (toLower(logType)) {
      case 'info':
        return 'blue';
      case 'success':
        return 'green';
      case 'warning':
        return 'yellow';
      case 'error':
        return 'red';
      case 'debug':
        return 'black';
      default:
        return 'grey';
    }
  }

  render() {
    const LogEntries = this.state.entries.map((entry) => {
      if (entry.type !== 'debug' || config.Config.App.debug) {
        return (
          <Feed key={entry.id} className="log" size="small">
            <Feed.Event>
              <Feed.Content>
                <Feed.Summary>
                  <Label color={this.labelColor(entry.type)} horizontal>
                    {capitalize(entry.type)}
                  </Label>
                  {capitalize(entry.source)} {entry.name ? ` — ${entry.name}` : ''} <Feed.Date>{entry.date}</Feed.Date>
                </Feed.Summary>
                <Feed.Extra>
                  <div dangerouslySetInnerHTML={{ __html: entry.message }} />
                </Feed.Extra>
              </Feed.Content>
            </Feed.Event>
          </Feed>
        );
      }
    });

    return (
      <div>
        <Header as="h1">Logs</Header>
        {LogEntries}
      </div>
    );
  }
}

module.exports = Logs;
