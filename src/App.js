import React, {useReducer, useEffect, Fragment} from 'react';
import { Layout, Select, Spin, Alert, Icon, Typography } from 'antd';
import { Polymath, browserUtils } from '@polymathnetwork/sdk';
import moment from 'moment';

import actions from './actions';
import Whitelist from './Whitelist';
import { networkConfigs } from './config';

const { Content, Header } = Layout;
const { Option } = Select;

function init() {
  return {
    shareholders: [],
    tokens: undefined,
    editingShareholder: false,
    tokenIndex: undefined,
    fetching: false,
    userAddress: '',
    polyClient: undefined,
    connected: false,
    error: '',
    networkId: 0
  };
}

function reducer(state, action) {
  switch (action.type) {
  case actions.CONNECTING:
    return { 
      ...state,
      tip: 'Connecting...',
      connecting: true,
      error: undefined
    }
  case actions.CONNECTED:
    return { 
      ...state,
      ...action.payload,
      connecting: false,
      tip: undefined,
      error: undefined,
    }
  case actions.CONNECTION_ERROR:
    const { error } = action.payload;
    return {
      ...state,
      error,
      connecting: false,
    }
  case actions.TOKEN_SELECTED:
    const { tokenIndex } = action.payload
    return { 
      ...state,
      tokenIndex,
      tip: 'Loading investors whitelist...',
      fetching: true 
    }
  case actions.SHAREHOLDERS_FETCHED:
    return { 
      ...state,
      fetching: false,
      tip: undefined,
    }
  case actions.STORE_SHAREHOLDERS:
    let { shareholders } = action.payload
    shareholders = shareholders.map(shareholder => {
      const ret = Object.assign({}, shareholder, {
        canReceiveAfter: moment(shareholder.canReceiveAfter),
        canSendAfter: moment(shareholder.canSendAfter),
        kycExpiry: moment(shareholder.kycExpiry)
      });
      return ret;
    });
    return { ...state, shareholders };
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

  try {
    const networkId = await browserUtils.getNetworkId();
    const currentWallet = await browserUtils.getCurrentAddress();
    if (![-1, 1, 42].includes(networkId)) {
      dispatch({ type: actions.CONNECTION_ERROR, payload: { error: 'Please switch to either Main or Kovan network' }})
      return;
    }

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
  catch(error) {
    dispatch({ type: actions.CONNECTION_ERROR, payload: { error: error.message }})
  }
}

async function fetchShareholders(dispatch, st) {
  let shareholders = await st.shareholders.getShareholders();
  dispatch({ type: actions.SHAREHOLDERS_FETCHED });
  dispatch({ type: actions.STORE_SHAREHOLDERS, payload: { shareholders }});
}

function Network({networkId}) {
  networkId = networkId.toString();
  const networks = {
    0: 'Disconnected',
    1: 'Mainnet',
    42: 'Kovan'
  }
  return (
    <Fragment>
      <Icon type="global" style={{ marginRight: 10, marginLeft: 20 }} />
      <Typography.Text>{networks[networkId]}</Typography.Text>
    </Fragment>
  );
}

function User({userAddress}) {
  if (userAddress)
    return (
      <Fragment>
        <Icon type="user"  style={{ marginRight: 5, marginLeft: 10 }}/>
        <Typography.Text>{userAddress}</Typography.Text>
      </Fragment>
    );
  return null;
}

function App() {
  const [state, dispatch] = useReducer(reducer, init(), init);
  const  { shareholders, tokens, tokenIndex, fetching, tip, userAddress, connecting, error, networkId } = state;
 
  useEffect(() => {
    connect(dispatch);
  }, []);

  useEffect(() => {
    if (tokenIndex !== undefined 
    ) {
      fetchShareholders(dispatch, tokens[tokenIndex]);
      // @TODO remove this
      global.token = tokens[tokenIndex];
    }
  }, [tokens, tokenIndex]);

  async function modifyWhitelist(data) {
    const queue = await tokens[tokenIndex].shareholders.modifyData({shareholderData: data});
    await queue.run();
    const seen = new Set();
    const updatedShareholders = [...data, ...shareholders].filter(s => {
      const duplicate = seen.has(s.address);
      seen.add(s.address);
      return !duplicate;
    });
    dispatch({type: actions.STORE_SHAREHOLDERS, payload: {shareholders: updatedShareholders}});
  }

  async function deleteShareholders(shareholders) {
    shareholders = shareholders.map(shareholder => ({
      address: shareholder.address,
      canReceiveAfter: 0,
      canSendAfter: 0,
      kycExpiry: 0,
      isAccredited: 0,
      canBuyFromSto: 0
    }));

    const queue = await tokens[tokenIndex].shareholders.modifyData({shareholderData: shareholders});
    await queue.run();
    await fetchShareholders(dispatch, tokens[tokenIndex]);
  }

  function generateTokensSelectOptions() {
    const options = !tokens ? [] : tokens.map((token, i) => 
      <Option value={i} key={i}>{token.symbol}</Option>)
    return options
  }

  return (
    <div className="App">
      <Spin spinning={fetching || connecting} tip={tip} size="large">
        <Layout>
          <Header style={{backgroundColor: 'white', display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center'}}>
            <Network networkId={networkId} />
            <User userAddress={userAddress} />
          </Header>
          <Content style={{ padding: 50, backgroundColor: '#FAFDFF' }}>
            { error && <Alert
              message={error}
              type="error"
            />}
            { userAddress &&
              <div style={{display: 'flex', flexDirection: 'column', width: 250, justifyContent: 'flex-start'}}>
                <Typography.Title level={3}>Please Select a Token</Typography.Title>
                <Typography.Text style={{paddingTop: 20, paddingBottom: 20, width: '100%'}}>Once you select a token, you will be able to manage investors white-list by adding, editing or removing investors.</Typography.Text>
                <Select
                  autoFocus
                  showSearch
                  style={{ width: '100%', marginBottom: 40 }}
                  placeholder="Select a token"
                  optionFilterProp="children"
                  onChange={(index) => dispatch({ type: actions.TOKEN_SELECTED, payload: { tokenIndex: index }})}
                  filterOption={(input, option) =>
                    option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {generateTokensSelectOptions()}
                </Select>
              </div>
            }
            { tokenIndex !== undefined && 
              <Whitelist
                modifyWhitelist={modifyWhitelist}
                deleteShareholders={deleteShareholders}
                shareholders={shareholders}
              />
            }
          </Content>
        </Layout>
      </Spin>
    </div>
  );
}

export default App;
