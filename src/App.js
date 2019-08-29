import React, {useReducer, useEffect, Fragment} from 'react'
import { Layout, Select, Spin, Alert, Icon, Typography } from 'antd'
import { Polymath, browserUtils } from '@polymathnetwork/sdk'
import moment from 'moment'

import actions from './actions'
import Whitelist from './Whitelist'
import { networkConfigs } from './config'

const { Content, Header } = Layout
const { Option } = Select

const initialState = {
  shareholders: [],
  tokens: undefined,
  editingShareholder: false,
  selectedToken: undefined,
  fetching: false,
  userAddress: '',
  polyClient: undefined,
  connected: false,
  error: '',
  networkId: 0,
  tip: ''
}

function reducer(state, action) {
  console.log('ACTION', action)
  switch (action.type) {
  case actions.CONNECTING:
    return {
      ...state,
      connecting: true, // Spinner will keep on spinning until connection has established.
      tip: 'Connecting...', // Message to display while connecting.
      error: undefined // Clear previous error, if any.
    }
  case actions.CONNECTED:
    const { polyClient, networkId, userAddress } = action
    return {
      ...state,
      polyClient,
      networkId,
      userAddress,
      connecting: false,
      tip: '',
      error: undefined,
    }
  case actions.CONNECTION_ERROR:
    const { error } = action
    return {
      ...state,
      error,
      tokens: undefined,
      connecting: false,
      tip: '',
    }
  case actions.FETCHING_TOKENS:
    return {
      ...state,
      fetching: true,
      tip: 'Fetching tokens'
    }
  case actions.FETCHED_TOKENS:
    const { tokens, tokenSelectOpts } = action
    return {
      ...state,
      tokenSelectOpts,
      tokens,
      fetching: false,
      tip: ''
    }
  case actions.TOKEN_SELECTED:
    const { selectedToken } = action
    return {
      ...state,
      selectedToken,
      tip: 'Loading tokenholders...',
      fetching: true
    }
  case actions.RELOAD_SHAREHOLDERS:
    return {
      ...state,
      fetching: true,
      tip: 'Reloading tokenholders...',
      reloadShareholders: true,
    }
  case actions.SHAREHOLDERS_FETCHED:
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

  case actions.ERROR:
    return {
      ...state,
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
      <Typography.Text>{networks[networkId]}</Typography.Text>
    </Fragment>
  )
}

function User({userAddress}) {
  if (userAddress)
    return (
      <Fragment>
        <Icon type="user"  style={{
          marginRight: 5,
          marginLeft: 10
        }}/>
        <Typography.Text>{userAddress}</Typography.Text>
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
    userAddress,
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
      dispatch({
        type: actions.CONNECTING
      })

      try {
        // A2. Get the current network and make sure it's either Mainnet or Kovan.
        const networkId = await browserUtils.getNetworkId()
        const currentWallet = await browserUtils.getCurrentAddress()
        if (![-1, 1, 42].includes(networkId)) {
          dispatch({
            type: actions.CONNECTION_ERROR,
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
          type: actions.CONNECTED,
          networkId,
          polyClient,
          userAddress: currentWallet,
        })
      }
      catch(error) {
        // A4. Dispatch ERROR action in order to display any errors thrown in the process.
        dispatch({
          type: actions.CONNECTION_ERROR,
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
    async function fetchTokens(dispatch, polyClient, userAddress) {
      dispatch({type: actions.FETCHING_TOKENS})
      const tokens = await polyClient.getSecurityTokens({ userAddress })
      const tokenSelectOpts = tokens.map((token, i) =>
        <Option value={i} key={i}>{token.symbol}</Option>)

      dispatch({type: actions.FETCHED_TOKENS, tokens, tokenSelectOpts})
    }
    if (polyClient && userAddress && !tokens) {
      fetchTokens(dispatch, polyClient, userAddress)
    }
  }, [userAddress, polyClient, tokens])

  // c. Fetch tokenholders
  useEffect(() => {
    async function fetchShareholders(dispatch, st) {
      let shareholders = await st.shareholders.getShareholders()
      dispatch({
        type: actions.SHAREHOLDERS_FETCHED,
        shareholders
      })
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
    dispatch({type:actions.RELOAD_SHAREHOLDERS})
  }

  async function removeShareholders(addresses) {
    console.log('App.removeShareholders', addresses)
    const queue = await tokens[selectedToken].shareholders.revokeKyc({
      shareholderAddresses: addresses
    })
    await queue.run()
    dispatch({type:actions.RELOAD_SHAREHOLDERS})
  }

  return (
    <div className="App">
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
            <User userAddress={userAddress} />
          </Header>
          <Content style={{
            padding: 50,
            backgroundColor: '#FAFDFF'
          }}>
            { error && <Alert
              message={error}
              type="error"
            />}
            { userAddress &&
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                width: 250,
                justifyContent: 'flex-start'
              }}>
                <Typography.Title level={3}>Please Select a Token</Typography.Title>
                <Typography.Text style={{
                  paddingTop: 20,
                  paddingBottom: 20,
                  width: '100%'
                }}>
                  Once you select a token, you will be able to manage token holders white-list by adding,
                  editing or removing token holders.
                </Typography.Text>
                <Select
                  autoFocus
                  showSearch
                  style={{
                    width: '100%',
                    marginBottom: 40
                  }}
                  placeholder="Select a token"
                  optionFilterProp="children"
                  onChange={(index) => dispatch({
                    type: actions.TOKEN_SELECTED,
                    selectedToken: index
                  })}
                  filterOption={(input, option) =>
                    option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {tokenSelectOpts}
                </Select>
              </div>
            }
            { selectedToken !== undefined &&
              <Whitelist
                modifyWhitelist={modifyWhitelist}
                removeShareholders={removeShareholders}
                shareholders={shareholders}
              />
            }
          </Content>
        </Layout>
      </Spin>
    </div>
  )
}

export default App
