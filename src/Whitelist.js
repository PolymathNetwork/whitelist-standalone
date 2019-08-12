import React, { Fragment, useState } from 'react';
import { Table, Button, Form, Input, DatePicker, Checkbox, Modal } from 'antd';

const {Item} = Form;

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
    const [adding, setAdding] = useState(false);
    const formItemLayout = {
        labelCol: {
            xs: { span: 24 },
            sm: { span: 8 },
        },
        wrapperCol: {
            xs: { span: 24 },
            sm: { span: 16 },
        },
    };

    const handleSubmit = e => {
        e.preventDefault();
        this.props.form.validateFieldsAndScroll((err, values) => {
            if (!err) {
                console.log('Received values of form: ', values);
            }
            console.log(values)
        });
    };

    return <Fragment>
        <Table columns={columns} dataSource={shareholders} rowKey="address" />
        <Modal
            title="Add a new shareholder"
            okText="Save"
            visible={adding}
            onCancel={() => setAdding(false)}>
            <Form {...formItemLayout}>
                <Item name="address" label="Address">
                    <Input placeholder="address" />
                </Item>
                <Item name="canSendAfter"  label="Can send after">
                    <DatePicker />
                </Item>
                <Item name="canReceiveAfter" label="Can receive adter">
                    <DatePicker />
                </Item>
                <Item name="kycExpiry" label="KYC expiry">
                    <DatePicker />
                </Item>
                <Item name="canBuyFromSto" label="Can buy from STO">
                    <Checkbox />
                </Item>
                <Item name="isAccredited" label="Is accredited">
                    <Checkbox />
                </Item>
            </Form>
        </Modal>
        <Button type="primary" onClick={() => setAdding(true)}>Add shareholder</Button>
    </Fragment>;
}