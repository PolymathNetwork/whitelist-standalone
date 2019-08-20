import React, { Fragment } from 'react';
import moment from 'moment';
import { utils as web3Utils } from 'web3';
import { Table, Button, Form, Input, DatePicker, Checkbox, Modal, Typography, Spin, Icon, message } from 'antd';
import TrueSVG from './assets/icon-true.svg';

const {Column} = Table;
const {Item} = Form;
const {Text} = Typography;

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

function formatDate(input) {
    return moment(input).format('YYYY-MM-DD');
}

function formatBool(input) {
    return input ? 
        <Fragment><Icon style={{color: '#00AA5E'}} type="check-circle" theme="filled"/><span>   Yes</span></Fragment> :
        <Fragment><Icon style={{color: '#DB2C3E'}} type="close-circle" theme="filled"/><span>   No</span></Fragment>;
}

const defaultShareholderValues = {
    address: '',
    canSendAfter: moment().add(1, 'hour'),
    canReceiveAfter: moment().add(1, 'hour'),
    kycExpiry: moment().add(1, 'year'),
    canBuyFromSto: true,
    isAccredited: false
}

const WhitelistForm = Form.create({ name: 'form_in_modal' })(
    class extends React.Component {
        
        render() {
            const { visible,
                onCancel,
                onOk, form,
                awaitingConfirmation,
                editedRecord,
                shareholderExists
            } = this.props;
            let defaultValues = editedRecord || defaultShareholderValues;
            
            const { getFieldDecorator } = form;
            return ( 
            <Modal
                title={editedRecord ? "Edit shareholder" : "Add a new shareholder"}
                okText="Save"
                visible={visible}
                onCancel={onCancel}
                onOk={onOk}
                confirmLoading={awaitingConfirmation}
            >
                <Spin spinning={awaitingConfirmation} size="large">
                <Form {...formItemLayout}>
                    <Item name="address" label="Address">
                        {getFieldDecorator('address', {
                            rules: [
                                { required: true  },
                                {
                                    validator: (rule, value, callback) => {
                                        if (!editedRecord && !web3Utils.isAddress(value)) {
                                            callback('Address is invalid')
                                            return;
                                        }
                                        callback()
                                        return;
                                    }
                                },
                                {
                                    validator: (rule, value, callback) => {
                                        if (!editedRecord && shareholderExists(value)) {
                                            callback('Shareholder is already present in the whitelist')
                                            return;
                                        }
                                        callback()
                                        return;
                                    }
                                }
                            ],
                            initialValue: defaultValues.address
                        })(
                            <Input disabled={!!editedRecord}/>
                        )}
                    </Item>
                    <Item name="canSendAfter"  label="Can Send after">
                        {getFieldDecorator('canSendAfter', {
                            rules: [{ required: true }],
                            initialValue: defaultValues.canSendAfter
                        })(
                            <DatePicker />
                        )}
                    </Item>
                    <Item name="canReceiveAfter" label="Can Receive adter">
                        {getFieldDecorator('canReceiveAfter', {
                            rules: [{ required: true }],
                            initialValue: defaultValues.canReceiveAfter
                        })(
                            <DatePicker />
                        )}
                    </Item>
                    <Item name="kycExpiry" label="KYC Expiry">
                        {getFieldDecorator('kycExpiry', {
                            rules: [{ required: true }],
                            initialValue: defaultValues.kycExpiry
                        })(
                            <DatePicker />
                        )}
                    </Item>
                    <Item name="canBuyFromSto" label="Can Buy from STO">
                        {getFieldDecorator('canBuyFromSto', {
                            valuePropName: 'checked',
                            initialValue: defaultValues.canBuyFromSto
                        })(
                            <Checkbox/>
                        )}
                    </Item>
                    <Item name="isAccredited" label="Accredited">
                        {getFieldDecorator('isAccredited', {
                            valuePropName: 'checked',
                            initialValue: defaultValues.isAccredited
                        })(
                            <Checkbox />
                        )}
                    </Item>
                </Form>
                </Spin>
            </Modal>
        )}
    }
);

export default class Whitelist extends React.Component {
    state = {
        editIndex: '',
        visible: false,
        awaitingConfirmation: false,
    }

    closeForm = () => {
        this.setState({
            editIndex: '',
            visible: false,
            awaitingConfirmation: false
        });
        const { form } = this.formRef.props;
        form.resetFields();
    }

    openForm = (index = '') => {
        this.setState({
            visible: true,
            editIndex: index
        });
    }

    submitForm = async () => {
        const { form } = this.formRef.props;
        const { modifyWhitelist } = this.props;
        form.validateFields(async (err, values) => {
            if (err) {
                return;
            }

            this.setState({ awaitingConfirmation: true })
        
            values.canSendAfter = values.canSendAfter.toDate();
            values.canReceiveAfter = values.canReceiveAfter.toDate();
            values.kycExpiry = values.kycExpiry.toDate();

            const error = await modifyWhitelist([values]);
            if (error) {
                this.setState({
                    awaitingConfirmation: false,
                });
                message.error(error.message)
            }
            else {
                this.setState({
                    visible: false,
                    awaitingConfirmation: false,
                    editIndex: ''
                });
                form.resetFields();
            }

        });
    };

    saveFormRef = formRef => {
        this.formRef = formRef;
    };

    shareholderExists = (address) => {
        const { shareholders } = this.props
        const ret =  shareholders.find((element) => element.address.toUpperCase() === address.toUpperCase())
         !== undefined
        return ret
    }
    
    render() {
        const { visible, awaitingConfirmation, editIndex } = this.state;
        
        const {shareholders} = this.props;
        let editedRecord = shareholders.filter(shareholder => shareholder.address === editIndex)[0]

        return <div style={{display: 'flex', flexDirection: 'column'}}>
            <Button type="primary" style={{marginBottom: 20, alignSelf: 'flex-end'}} onClick={() => this.openForm()}>Add new</Button>
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
                    return <Button onClick={() => this.openForm(record.address)}>
                        <Icon type="edit" />
                    </Button>
                }}/>
            </Table>
            <WhitelistForm 
                wrappedComponentRef={this.saveFormRef}
                visible={visible}
                onCancel={this.closeForm}
                onOk={this.submitForm}
                awaitingConfirmation={awaitingConfirmation}
                editedRecord={editedRecord}
                shareholderExists={this.shareholderExists}
            />
        </div>;
    }
}