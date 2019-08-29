
import React, { Fragment } from 'react'
import { Table, Button, Typography, Icon } from 'antd'
import { utils as web3Utils } from 'web3'
import moment from 'moment'

const {Column} = Table
const {Text} = Typography

function formatDate(input) {
  return moment(input).format('YYYY-MM-DD')
}

function formatBool(input) {
  return input ?
    <Fragment><Icon style={{color: '#00AA5E'}} type="check-circle" theme="filled"/><span>   Yes</span></Fragment> :
    <Fragment><Icon style={{color: '#DB2C3E'}} type="close-circle" theme="filled"/><span>   No</span></Fragment>
}

export default ({shareholders, openForm, removeShareholders}) => {
  return (
    <Table dataSource={shareholders} rowKey="address">
      <Column
        title='Address'
        dataIndex='address'
        key='address'
        render={(text) => <Text>{web3Utils.toChecksumAddress(text)}</Text>}
      />
      <Column
        title='Can send after'
        dataIndex='canSendAfter'
        key='canSendAfter'
        render={(text) => formatDate(text)}
      />
      <Column
        title='Can receive after'
        dataIndex='canReceiveAfter'
        key='canReceiveAfter'
        render={(text) => formatDate(text)}
      />
      <Column
        title='KYC expiry'
        dataIndex='kycExpiry'
        key='kycExpiry'
        render={(text) => formatDate(text)}
      />
      <Column
        title='Can buy from STO'
        dataIndex='canBuyFromSto'
        key='canBuyFromSto'
        render={(text) => formatBool(text)}
      />
      <Column
        title='Is accredited'
        dataIndex='isAccredited'
        key='isAccredited'
        render={(text) => formatBool(text)}
      />
      <Column render={(text, record) => {
        return (
          <Fragment>
            <Button onClick={() => openForm(record.address)}>
              <Icon type="edit" theme="filled" />
            </Button>
            <Button onClick={() => removeShareholders([record.address])}>
              <Icon type="delete" theme="filled" />
            </Button>
          </Fragment>
        )
      }}/>
    </Table>
  )
}