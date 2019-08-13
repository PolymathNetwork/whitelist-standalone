import React, {useReducer, useEffect} from 'react';
import { Layout, Input } from 'antd';
import { Polymath, browserUtils } from '@polymathnetwork/sdk';
import moment from 'moment';

import actions from './actions';
import './App.css';
import Whitelist from './Whitelist';

const { Content } = Layout;

function init() {
  return {
    tokenSymbol: 'RN',
    shareholders: [],
    editingShareholder: false,
    symbol: ''
  };
}

function reducer(state, action) {
  switch (action.type) {
    case actions.CONNECTED:
      const { polyClient } = action.payload
      return { ...state,
        polyClient,
        account: polyClient.context.currentWallet.address
      };
    case actions.SHAREHOLDERS_FETCHED:
      const { shareholders } = action.payload
      return { ...state,
        shareholders
      }
    case actions.TOKEN_FETCHED:
      const { token } = action.payload
      return { ...state,
        token
      }

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

  dispatch({type: actions.CONNECTED, payload: { 
    polyClient
  }});

}

async function fetchToken(dispatch, polyClient) {
  const token = await polyClient.getSecurityToken({symbol: 'RN'});
  dispatch({type: actions.TOKEN_FETCHED, payload: { 
    token
  }});

  // @TODO remove this
  global.token = token;
}

async function fetchShareholders(dispatch, st) {
  let shareholders = await st.shareholders.getShareholders();
  shareholders = shareholders.map(shareholder => {
    const ret = Object.assign({}, shareholder, {
      canReceiveAfter: moment(shareholder.canReceiveAfter),
      canSendAfter: moment(shareholder.canSendAfter),
      kycExpiry: moment(shareholder.kycExpiry)
    })
    return ret;
  });
  
  dispatch({
    type: actions.SHAREHOLDERS_FETCHED,
    payload: { shareholders }
  })
}

function App() {
  const [state, dispatch] = useReducer(reducer, init(), init);
  const  { polyClient, symbol, token, shareholders } = state;

  useEffect(() => {
    connect(dispatch);
  }, []);

  useEffect(() => {
    if (polyClient) {
      fetchToken(dispatch, polyClient);
    }
  }, [polyClient])

  useEffect(() => {
    if (token) {
      fetchShareholders(dispatch, token);
    }
  }, [token]);

  async function modifyWhitelist(shareholders) {
    try {
      const queue = await token.shareholders.modifyData({shareholderData: shareholders});
      await queue.run();
      fetchShareholders(dispatch, token);
    }
    catch(error) {
      return error;
    }
  }

  return (
    <div className="App">
      <Layout>
        <Content style={{ padding: 50 }}>
          <Input value={symbol} onChange={e => console.log(e.target.value)} />
          { shareholders.length > 0 && 
            <Whitelist modifyWhitelist={modifyWhitelist} shareholders={shareholders} /> }
        </Content>
      </Layout>
    </div>
  );
}

export default App;
