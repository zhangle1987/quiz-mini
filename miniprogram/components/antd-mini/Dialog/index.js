import { Component, getValueFromProps, triggerEvent, triggerEventOnly, } from '../_util/simply';
import { ModalFunctionalProps } from './props';
Component({
    props: ModalFunctionalProps,
    methods: {
        onClose: function () {
            triggerEventOnly(this, 'close');
        },
        onMaskClose: function () {
            var maskClosable = getValueFromProps(this, 'maskClosable');
            if (maskClosable) {
                triggerEventOnly(this, 'close');
            }
        },
        onButtonTap: function (e) {
            var onButtonTap = getValueFromProps(this, 'onButtonTap');
            var item = e.currentTarget.dataset.item;
            triggerEvent(this, 'buttonTap', item, e);
        },
        onPrimaryButtonTap: function () {
            triggerEventOnly(this, 'primaryButtonTap');
        },
        onSecondaryButtonTap: function () {
            triggerEventOnly(this, 'secondaryButtonTap');
        },
        onCancelButtonTap: function () {
            triggerEventOnly(this, 'cancelButtonTap');
        },
    },
});
