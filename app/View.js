import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Route, Switch, Redirect } from 'react-router-dom';

import Layout from './pages/Layout';
import Logs from './pages/Logs';
import Config from './pages/Config';
import Preferences from './pages/Preferences';

ReactDOM.render(
  <BrowserRouter>
    <Layout>
      <Switch>
        <Route exact path="/" component={Logs} />
        <Route exact path="/config" component={Config} />
        <Route exact path="/preferences" component={Preferences} />
        <Redirect to="/" />
      </Switch>
    </Layout>
  </BrowserRouter>,
  document.getElementById('app')
);
