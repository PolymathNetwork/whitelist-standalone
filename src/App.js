import React, {useReducer, useEffect} from 'react';
import { Layout } from 'antd';
import { Polymath, browserUtils } from '@polymathnetwork/sdk';

import actions from './actions';
import './App.css';
import Whitelist from './Whitelist';

const { Content } = Layout;

function init() {
  return {
    tokenAddress: '0x6eE32d5498D08deB3fAa066A785615Dc1fabb4ad',
    tokenSymbol: 'RN',
    shareholders: [],
    editingShareholder: false
  };
}

function reducer(state, action) {
  switch (action.type) {
    case actions.CONNECTED:
      const { polyClient, token, shareholders } = action.payload
      return { ...state,
        polyClient,
        token,
        shareholders,
        account: polyClient.context.currentWallet.address
      };
    case actions.RESET:
      return init();
    default:
      throw new Error('Unrecognised action');
  }
}

async function connect(dispatch) {
  const networkConfigs = {
    1: {
      polymathRegistryAddress: '0x240f9f86b1465bf1b8eb29bc88cbf65573dfdd97'
    },
    42: {
      polymathRegistryAddress: '0x5b215a7d39ee305ad28da29bf2f0425c6c2a00b3'
    },
  };
  const networkId = await browserUtils.getNetworkId();
  const config = networkConfigs[networkId];
  const polyClient = new Polymath();
  await polyClient.connect(config);
  const st = await polyClient.getSecurityToken({symbol: 'RN'});
  let shareholders = await st.shareholders.getShareholders();

  shareholders = shareholders.map(shareholder => {
    let converted = {}
    Object.entries(shareholder).forEach(([key, value]) => {
      converted[key] = value.toString();
    });
    return converted;
  })

  dispatch({type: actions.CONNECTED, payload: { 
    polyClient,
    shareholders,
    token: st
  }});

  // @TODO remove this
  global.token = st;
}

function App() {
  const [state, dispatch] = useReducer(reducer, init(), init);
  const  { shareholders } = state;

  useEffect(() => {
    connect(dispatch);
  }, []);

  function handleEditShareholder() {

  }

  return (
    <div className="App">
      <Layout>
        <Content style={{ padding: 50 }}>
          <Whitelist shareholders={shareholders} />
        </Content>
      </Layout>
    </div>
  );
}

export default App;
