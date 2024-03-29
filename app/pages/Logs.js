import React from 'react';
import { Header, Feed, Divider, Label, Icon, Segment, Button } from 'semantic-ui-react';
import { capitalize, toLower } from 'lodash/string';
import { CopyToClipboard } from 'react-copy-to-clipboard';

const { ipcRenderer } = require('electron');
const remote = require('@electron/remote');

const config = remote.getGlobal('config');
const STATUS_COLOR_MAP = {
  success: 'green',
  info: 'blue',
  warning: 'yellow',
  error: 'red',
  debug: 'darkgrey',
};
const STATUS_ICON_MAP = {
  success: 'check',
  info: 'info circle',
  warning: 'warning sign',
  error: 'x',
  debug: 'code',
};
const determineLabelColor = (status) => STATUS_COLOR_MAP[status] || 'grey';
const determineLabelIcon = (status) => STATUS_ICON_MAP[status] || 'question';

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

  render() {
    const LogEntries = this.state.entries.map((entry) => {
      if (entry.type !== 'debug' || config.Config.Configuration.debug) {
        return (
          <Feed key={entry.id} className="log" size="small">
            <Feed.Event>
              <Feed.Content>
                <Feed.Summary>
                  <Label color={determineLabelColor(entry.type)} image horizontal>
                    <Icon name={determineLabelIcon(entry.type)} />
                    {capitalize(entry.source)}
                    {entry.name && <Label.Detail>{entry.name}</Label.Detail>}
                  </Label>
                  {entry.endpoint && (
                    <Label color="lightgrey" horizontal>
                      {entry.endpoint}
                    </Label>
                  )}
                  {entry.clipboard && (
                    <CopyToClipboard text={entry.clipboard} options={{ format: 'text/plain' }}>
                      <Button size="mini" icon compact>
                        <Icon name="copy" />
                      </Button>
                    </CopyToClipboard>
                  )}
                  <Feed.Date>{entry.date}</Feed.Date>
                </Feed.Summary>
                <Feed.Extra>
                  <div dangerouslySetInnerHTML={{ __html: entry.message }} />
                  {entry.clipboard && (
                    <Segment size="tiny">
                      <pre>{entry.clipboard}</pre>
                    </Segment>
                  )}
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
