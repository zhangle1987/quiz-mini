// @ts-nocheck
import { Component, getValueFromProps, triggerEvent, triggerEventOnly, } from '../_util/simply';
import { SenderProps } from './props';
Component({
    props: SenderProps,
    multipleSlots: true,
    methods: {
        handleMainBtn: function () {
            var loading = getValueFromProps(this, ['loading'])[0];
            if (loading) {
                this.handleCancel();
            }
            else {
                this.handleSubmit();
            }
        },
        handleConfirm: function () {
            var value = getValueFromProps(this, ['value'])[0];
            triggerEvent(this, 'confirm', value);
        },
        handleSubmit: function () {
            var value = getValueFromProps(this, ['value'])[0];
            triggerEvent(this, 'submit', value);
        },
        handleCancel: function () {
            triggerEventOnly(this, 'cancel');
        },
        handleInput: function (e) {
            triggerEvent(this, 'change', e.detail.value);
        },
        handleFocus: function () {
            triggerEvent(this, 'focus');
        },
        handleBlur: function () {
            triggerEvent(this, 'blur');
        },
    },
});
