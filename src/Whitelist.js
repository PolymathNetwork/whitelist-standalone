import React from 'react';
import { Table } from 'antd';
const { Column } = Table;

const columns = [
    {
        title: 'Address',
        dataIndex: 'address',
        key: 'address',
        editable: false
    },
    {
        title: 'Can send after',
        dataIndex: 'canSendAfter',
        key: 'canSendAfter',
        editable: true
    },
    {
        title: 'Can receive after',
        dataIndex: 'canReceiveAfter',
        key: 'canReceiveAfter',
        editable: true
    },
    {
        title: 'KYC expiry',
        dataIndex: 'kycExpiry',
        key: 'kycExpiry',
        editable: true
    },
    {
        title: 'Can buy from STO',
        dataIndex: 'canBuyFromSto',
        key: 'canBuyFromSto',
        editable: true
    },
    {
        title: 'Is accredited',
        dataIndex: 'isAccredited',
        key: 'isAccredited',
        editable: true
    }
];

export default function Whitelist({shareholders}) {
    return <Table columns={columns} dataSource={shareholders} rowKey="address" />;
}