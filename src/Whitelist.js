import React, { useEffect, useReducer } from 'react';
import useForm from 'rc-form-hooks';
import moment from 'moment';
import { utils as web3Utils } from 'web3';
import { Button, Form, Input, DatePicker, Modal, Spin, message, Switch } from 'antd';

import ShareholdersTable from './ShareholdersTable';

const {Item} = Form;

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


const defaultShareholderValues = {
  address: '',
  canSendAfter: moment().add(1, 'hour'),
  canReceiveAfter: moment().add(1, 'hour'),
  kycExpiry: moment().add(1, 'year'),
  canBuyFromSto: true,
  isAccredited: false
}

const initialState = {
  editIndex: '',
  visible: false,
  ongoingTx: false,
}

const reducer = (state, action) => {
  switch (action.type) {
  case 'OPEN_FORM':
    const { editIndex } = action.payload;
    return {
      ...state,
      visible: true,
      editIndex
    }
  case 'CLOSE_FORM':
    return {
      ...state,
      editIndex: '',
      visible: false,
      ongoingTx: false
    }
  case 'TX_SEND':
    return {
      ...state,
      ongoingTx: true
    }
  case 'TX_RECEIPT':
    return {
      ...state,
      ongoingTx: false,
      visible: false,
      error: '',
      editIndex: ''
    }
  case 'TX_ERROR':
    const { error } = action.payload
    return {
      ...state,
      error,
      ongoingTx: false
    }
  default:
    return state;
  }
}

export default ({modifyWhitelist, shareholders}) => {
  const form = useForm();
  const { getFieldDecorator, setFieldsValue, resetFields, validateFields } = form;
  const [state, dispatch] = useReducer(reducer, initialState);
  const { visible, editIndex, ongoingTx } = state;

  const shareholderExists = (address) => {
    const ret =  shareholders.find((element) => element.address.toUpperCase() === address.toUpperCase())
         !== undefined
    return ret
  }

  const closeForm = () => {
    dispatch({type: 'CLOSE_FORM'});
    resetFields();
  }

  const openForm = (index = '') => {
    dispatch({ type: 'OPEN_FORM',
      payload: { editIndex: index } });
  }

  const submitForm = async () => {
    const fields = ['address', 'canSendAfter', 'canReceiveAfter', 'kycExpiry', 'canBuyFromSto', 'isAccredited'];
    validateFields(fields, { force: true })
      .then(async (values) => {
        dispatch({type: 'TX_SEND'})

        values.canSendAfter = values.canSendAfter.toDate();
        values.canReceiveAfter = values.canReceiveAfter.toDate();
        values.kycExpiry = values.kycExpiry.toDate();

        try {
          await modifyWhitelist([values]);
          dispatch({ type: 'TX_RECEIPT'});
          resetFields();
        }
        catch (error) {
          dispatch({ type: 'TX_ERROR',
            payload: {error: error.message} });
          message.error(error.message);
        }
      });
  };

  let editedRecord = shareholders.filter(shareholder => shareholder.address === editIndex)[0];

  useEffect(() => {
    let initialValues = editedRecord || defaultShareholderValues;
    setFieldsValue(initialValues);
  }, [editedRecord, setFieldsValue]);

  return (
    <div style={{display: 'flex',
      flexDirection: 'column'}}>
      <Button type="primary" style={{marginBottom: 20,
        alignSelf: 'flex-end'}} onClick={openForm}>Add new</Button>
      <ShareholdersTable shareholders={shareholders} openForm={openForm} />
      <Modal
        title={editedRecord ? "Edit shareholder" : "Add a new shareholder"}
        okText="Save"
        closable={false}
        visible={visible}
        footer={null}
      >
        <Spin spinning={ongoingTx} size="large">
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
              })(<Input disabled={!!editedRecord}/>)}
            </Item>
            <Item name="canSendAfter"  label="Can Send after">
              {getFieldDecorator('canSendAfter', {
                rules: [{ required: true }],
              })(<DatePicker />)}
            </Item>
            <Item name="canReceiveAfter" label="Can Receive adter">
              {getFieldDecorator('canReceiveAfter', {
                rules: [{ required: true }],
              })(<DatePicker />)}
            </Item>
            <Item name="kycExpiry" label="KYC Expiry">
              {getFieldDecorator('kycExpiry', {
                rules: [{ required: true }],
              })(<DatePicker />)}
            </Item>
            <Item name="canBuyFromSto" label="Can Buy from STO">
              {getFieldDecorator('canBuyFromSto', {
                valuePropName: 'checked',
              })(<Switch />)}
            </Item>
            <Item name="isAccredited" label="Accredited">
              {getFieldDecorator('isAccredited', {
                valuePropName: 'checked',
              })(<Switch />)}
            </Item>
            <Item>
              <Button onClick={closeForm}>cancel</Button>
              <Button onClick={submitForm}>save</Button>
            </Item>
          </Form>
        </Spin>
      </Modal>
    </div>
  );
}