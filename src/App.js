import React, {useReducer, useEffect, Fragment} from 'react'
import { Layout, Select, Spin, Alert, Icon, Typography } from 'antd'
import { Polymath, browserUtils } from '@polymathnetwork/sdk'
import moment from 'moment'

import DispatchContext from '.'
import a from './actions'
import TokenSelector from './TokenSelector'
import Whitelist from './Whitelist'
import { networkConfigs } from './config'

const { Content, Header } = Layout
const { Option } = Select
const { Text } = Typography

const initialState = {
  shareholders: [],
  tokens: undefined,
  editingShareholder: false,
  selectedToken: undefined,
  fetching: false,
  walletAddress: '',
  polyClient: undefined,
  connected: false,
  error: '',
  networkId: 0,
  tip: ''
}

function reducer(state, action) {
  console.log('ACTION', action)
  switch (action.type) {
  case a.CONNECTING:
    return {
      ...state,
      connecting: true, // Spinner will keep on spinning until connection has established.
      tip: 'Connecting...', // Message to display while connecting.
      error: undefined // Clear previous error, if any.
    }
  case a.CONNECTED:
    const { polyClient, networkId, walletAddress } = action
    return {
      ...state,
      polyClient,
      networkId,
      walletAddress,
      connecting: false,
      tip: '',
      error: undefined,
    }
  case a.CONNECTION_ERROR:
    const { error } = action
    return {
      ...state,
      error,
      tokens: undefined,
      connecting: false,
      tip: '',
    }
  case a.FETCHING_TOKENS:
    return {
      ...state,
      fetching: true,
      tip: 'Fetching tokens'
    }
  case a.FETCHED_TOKENS:
    const { tokens, tokenSelectOpts } = action
    return {
      ...state,
      tokenSelectOpts,
      tokens,
      fetching: false,
      tip: ''
    }
  case a.TOKEN_SELECTED:
    const { selectedToken } = action
    return {
      ...state,
      selectedToken,
      tip: 'Loading tokenholders...',
      fetching: true
    }
  case a.RELOAD_SHAREHOLDERS:
    return {
      ...state,
      fetching: true,
      tip: 'Reloading tokenholders...',
      reloadShareholders: true,
    }
  case a.SHAREHOLDERS_FETCHED:
    let { shareholders } = action
    shareholders = shareholders.map(shareholder => {
      const ret = Object.assign({}, shareholder, {
        canReceiveAfter: moment(shareholder.canReceiveAfter),
        canSendAfter: moment(shareholder.canSendAfter),
        kycExpiry: moment(shareholder.kycExpiry)
      })
      return ret
    })
    return {
      ...state,
      shareholders,
      fetching: false,
      tip: '',
      reloadShareholders: false,
    }
  case a.DELETING_SHAREHOLDER:
    return {
      ...state,
      fetching: true,
      tip: 'Deleting token holder'
    }
  case a.SHAREHOLDER_DELETED:
    return {
      ...state,
      fetching: false,
      tip: ''
    }
  case a.ERROR:
    const { error: error2 } = action
    return {
      ...state,
      error: error2,
      fetching: false
    }
  default:
    throw new Error(`Unrecognized action "${action.type}"`)
  }
}

function Network({networkId}) {
  networkId = networkId.toString()
  const networks = {
    0: 'Disconnected',
    1: 'Mainnet',
    42: 'Kovan'
  }
  return (
    <Fragment>
      <Icon type="global" style={{
        marginRight: 10,
        marginLeft: 20
      }} />
      <Text>{networks[networkId]}</Text>
    </Fragment>
  )
}

function User({walletAddress}) {
  if (walletAddress)
    return (
      <Fragment>
        <Icon type="user"  style={{
          marginRight: 5,
          marginLeft: 10
        }}/>
        <Text>{walletAddress}</Text>
      </Fragment>
    )
  return null
}

function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const  {
    shareholders,
    tokens,
    selectedToken,
    fetching,
    tip,
    walletAddress,
    connecting,
    error,
    networkId,
    connected,
    polyClient,
    reloadShareholders,
    tokenSelectOpts
  } = state

  // A. Connect to Polymath ecosystem
  useEffect(() => {
    async function connect(dispatch) {
      // A1. Start the spinner!
      dispatch({ type: a.CONNECTING })

      try {
        // A2. Get the current network and make sure it's either Mainnet or Kovan.
        const networkId = await browserUtils.getNetworkId()
        const walletAddress = await browserUtils.getCurrentAddress()
        if (![-1, 1, 42].includes(networkId)) {
          dispatch({
            type: a.CONNECTION_ERROR,
            error: 'Please switch to either Main or Kovan network'
          })
          return
        }

        // A3. Instantiate and configure the SDK. Then, dispatch CONNECTED action with
        // the necessary state variables. This should also stop the snipper.
        const config = networkConfigs[networkId]
        const polyClient = new Polymath()
        await polyClient.connect(config)
        dispatch({
          type: a.CONNECTED,
          networkId,
          polyClient,
          walletAddress,
        })
      }
      catch(error) {
        // A4. Dispatch ERROR action in order to display any errors thrown in the process.
        dispatch({
          type: a.CONNECTION_ERROR,
          error: error.message
        })
      }
    }

    // Attempt to connect but only if we haven't connected yet.
    if (!connected) {
      connect(dispatch)
    }
  }, [connected])

  // b. Fetch tokens
  useEffect(() => {
    async function fetchTokens(dispatch, polyClient, walletAddress) {
      dispatch({type: a.FETCHING_TOKENS})
      const tokens = await polyClient.getSecurityTokens({ walletAddress })
      const tokenSelectOpts = tokens.map((token, i) =>
        <Option value={i} key={i}>{token.symbol}</Option>)

      dispatch({type: a.FETCHED_TOKENS, tokens, tokenSelectOpts})
    }
    if (polyClient && walletAddress && !tokens) {
      fetchTokens(dispatch, polyClient, walletAddress)
    }
  }, [walletAddress, polyClient, tokens])

  // c. Fetch share holders.
  useEffect(() => {
    async function fetchShareholders(dispatch, st) {
      let shareholders = await st.shareholders.getShareholders()
      dispatch({ type: a.SHAREHOLDERS_FETCHED, shareholders })
    }
    if ( reloadShareholders === true | selectedToken !== undefined ) {
      fetchShareholders(dispatch, tokens[selectedToken])
    }
  }, [tokens, selectedToken, reloadShareholders])

  async function modifyWhitelist(data) {
    const queue = await tokens[selectedToken].shareholders.modifyData({
      shareholderData: data
    })
    await queue.run()
    dispatch({type:a.RELOAD_SHAREHOLDERS})
  }

  async function removeShareholders(addresses) {
    dispatch({type: a.DELETING_SHAREHOLDER})
    try {
      const queue = await tokens[selectedToken].shareholders.revokeKyc({
        shareholderAddresses: addresses
      })
      await queue.run()
      dispatch({type: a.SHAREHOLDER_DELETED})
    }
    catch (error) {

    }
    dispatch({type:a.RELOAD_SHAREHOLDERS})
  }

  return (
    <div className="App">
      <DispatchContext.Provider value={dispatch}>
        <Spin spinning={fetching || connecting} tip={tip} size="large">
          <Layout>
            <Header style={{
              backgroundColor: 'white',
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'flex-end',
              alignItems: 'center'
            }}>
              <Network networkId={networkId} />
              <User walletAddress={walletAddress} />
            </Header>
            <Content style={{
              padding: 50,
              backgroundColor: '#FAFDFF'
            }}>
              { error &&
                <Alert
                  message={error}
                  type="error"/>
              }
              { walletAddress &&
                <TokenSelector
                  tokenSelectOpts={tokenSelectOpts}/>
              }
              { selectedToken !== undefined &&
                <Whitelist
                  modifyWhitelist={modifyWhitelist}
                  removeShareholders={removeShareholders}
                  shareholders={shareholders}/>
              }
            </Content>
          </Layout>
        </Spin>
      </DispatchContext.Provider>
    </div>
  )
}

export default App
