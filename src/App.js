import React, {useReducer, useEffect} from 'react';
import { Layout, Input, Button, Form, Icon, Tabs, Select, Spin } from 'antd';
import { Polymath, browserUtils } from '@polymathnetwork/sdk';
import moment from 'moment';

import actions from './actions';
import Whitelist from './Whitelist';

const { Content, Header } = Layout;
const { Item } = Form;
const { TabPane } = Tabs;
const { Option } = Select;

function init() {
  return {
    shareholders: [],
    tokens: undefined,
    editingShareholder: false,
    tokenIndex: undefined,
    fetching: false,
    userAddress: ''
  };
}

function reducer(state, action) {
  switch (action.type) {
    case actions.CONNECTING:
      return { ...state, tip: 'Loading your tokens...', fetching: true }
    case actions.CONNECTED:
      return { 
        ...state,
        ...action.payload,
        fetching: false
      }
    case actions.TOKEN_SELECTED:
      const { tokenIndex } = action.payload
      return { ...state, tokenIndex, tip: 'Loading investors whitelist...', fetching: true }
    case actions.SHAREHOLDERS_FETCHED:
      const { shareholders } = action.payload
      return { ...state, shareholders, fetching: false }
    case actions.ERROR:
        return { ...state, fetching: false }
    case actions.RESET:
      return init();
    default:
      throw new Error(`Unrecognised action "${action.type}"`);
  }
}

async function connect(dispatch) {
  dispatch({type: actions.CONNECTING});

  const networkConfigs = {
    1: {
      polymathRegistryAddress: '0xdfabf3e4793cd30affb47ab6fa4cf4eef26bbc27'
    },
    42: {
      polymathRegistryAddress: '0x5b215a7d39ee305ad28da29bf2f0425c6c2a00b3'
    },
  };
  const networkId = await browserUtils.getNetworkId();
  const currentWallet = await browserUtils.getCurrentAddress();
  const config = networkConfigs[networkId];
  const polyClient = new Polymath();
  await polyClient.connect(config);
  const tokens = await polyClient.getSecurityTokens({owner: currentWallet});

  dispatch({type: actions.CONNECTED, payload: {
    networkId,
    polyClient,
    tokens,
    userAddress: currentWallet,
  }});

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
  const  { shareholders, tokens, tokenIndex, fetching, tip, userAddress } = state;
 

  useEffect(() => {
    connect(dispatch);
  }, []);

  useEffect(() => {
    if (tokenIndex !== undefined) {
      fetchShareholders(dispatch, tokens[tokenIndex]);
      // @TODO remove this
      global.token = tokens[tokenIndex];
    }
  }, [tokens, tokenIndex]);

  async function modifyWhitelist(shareholders) {
    try {
      const queue = await tokens[tokenIndex].shareholders.modifyData({shareholderData: shareholders});
      await queue.run();
      await fetchShareholders(dispatch, tokens[tokenIndex]);
    }
    catch(error) {
      return error;
    }
  }

  function generateTokensSelectOptions() {
    const options = !tokens ? [] : tokens.map((token, i) => 
      <Option value={i} key={i}>{token.symbol}</Option>)
    return options
  }

  return (
    <div className="App">
      <Spin spinning={fetching} tip={tip} size="large">
        <Layout>
          <Header style={{backgroundColor: 'white', display: 'flex', flexDirection: 'row', justifyContent: 'flex-end'}}>
            <span style={{color: '#1348E4'}}>{userAddress}</span>
          </Header>
          <Content style={{ padding: 50, backgroundColor: '#FAFDFF' }}>
            <Select
              autoFocus
              showSearch
              style={{ width: 200, marginBottom: 50 }}
              placeholder="Select a token"
              optionFilterProp="children"
              onChange={(index) => dispatch({ type: actions.TOKEN_SELECTED, payload: { tokenIndex: index }})}
              filterOption={(input, option) =>
                option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {generateTokensSelectOptions()}
            </Select>
            { tokenIndex !== undefined && 
              <Whitelist modifyWhitelist={modifyWhitelist} shareholders={shareholders} /> }
          </Content>
        </Layout>
      </Spin>
    </div>
  );
}

export default App;
