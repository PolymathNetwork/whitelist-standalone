import React, {useReducer, useEffect} from 'react';
import { Layout, Input, Button, Form, message } from 'antd';
import { Polymath, browserUtils } from '@polymathnetwork/sdk';
import moment from 'moment';

import actions from './actions';
import './App.css';
import Whitelist from './Whitelist';

const { Content } = Layout;
const { Item } = Form;

function init() {
  return {
    shareholders: [],
    editingShareholder: false,
    // symbol: '',
    fetching: false,
    userAddress: ''
  };
}

function reducer(state, action) {
  switch (action.type) {
    case actions.CONNECTED:
      return { 
        ...state,
        ...action.payload
      };
    // case actions.SYMBOL_CHANGED:
    //   const { symbol } = action.payload
    //   return {...state, symbol}
    case actions.SHAREHOLDERS_FETCHED:
      const { shareholders } = action.payload
      return { ...state, shareholders }
    case actions.TOKEN_FETCH:
      return { ...state, fetching: true, error: undefined }
    case actions.TOKEN_FETCHED:
      const { token } = action.payload
      return { ...state, token, fetching: false }
    case actions.ERROR:
        return { ...state, fetching: false }
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
  const currentWallet = await browserUtils.getCurrentAddress();
  console.log(currentWallet);
  const config = networkConfigs[networkId];
  const polyClient = new Polymath();
  await polyClient.connect(config);
  const tokens = await polyClient.getSecurityTokens({owner: currentWallet});
  // console.log(tokens)

  dispatch({type: actions.CONNECTED, payload: {
    networkId,
    polyClient,
    tokens,
    userAddress: currentWallet,
  }});

}

// async function fetchToken(dispatch, polyClient, symbol) {
//   try {
//     const token = await polyClient.getSecurityToken({symbol});
//     dispatch({type: actions.TOKEN_FETCHED, payload: { 
//       token
//     }});

//     // @TODO remove this
//     global.token = token;
//   }
//   catch(error) {
//     if(error.message.includes('There is no Security Token with symbol')) {
//       message.error(`There is no Security Token with symbol "${symbol}"`);
//       dispatch({type: actions.ERROR, payload: {error: 'Symbol not found'}})
//     }
//   }
// }

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
  const  { polyClient, token, shareholders, fetching, userAddress } = state;

  useEffect(() => {
    connect(dispatch);
  }, []);

  // useEffect(() => {
  //   if (polyClient && fetching && symbol) {
  //     fetchToken(dispatch, polyClient, symbol);
  //   }
  // }, [polyClient, fetching, symbol])

  // useEffect(() => {
  //   if (polyClient && userAddress)
  // })

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
        <Content style={{ padding: 50, backgroundColor: 'white' }}>
          {/* <Form style={{ paddingBottom: 50}} layout="inline">
            <Item>
              <Input size="default" value={symbol} placeholder="Symbol" onPressEnter={() => 
                dispatch({type: actions.TOKEN_FETCH})}
              onChange={e => dispatch({
                type: actions.SYMBOL_CHANGED,
                payload: {symbol: e.target.value.toUpperCase()}
              })} />
            </Item>
            <Item>
              <Button type="primary" loading={fetching} disabled={!symbol} onClick={() => 
                dispatch({type: actions.TOKEN_FETCH})}>Fetch</Button>
            </Item>
          </Form> */}
          { shareholders.length > 0 && 
            <Whitelist modifyWhitelist={modifyWhitelist} shareholders={shareholders} /> }
        </Content>
      </Layout>
    </div>
  );
}

export default App;
