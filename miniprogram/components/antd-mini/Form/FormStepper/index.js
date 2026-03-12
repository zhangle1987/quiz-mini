import { resolveEventValue } from '../../_util/platform';
import { Component, triggerEvent, triggerEventOnly } from '../../_util/simply';
import { createForm } from '../form';
import { FormStepperDefaultProps } from './props';
Component({
    props: FormStepperDefaultProps,
    methods: {
        onChange: function (value, e) {
            this.emit('onChange', resolveEventValue(value));
            triggerEvent(this, 'change', resolveEventValue(value), e);
        },
        onBlur: function (e) {
            triggerEventOnly(this, 'blur', e);
        },
        onFocus: function (e) {
            triggerEventOnly(this, 'focus', e);
        },
        onConfirm: function (value, e) {
            triggerEvent(this, 'confirm', resolveEventValue(value), e);
        },
    },
    mixins: [createForm()],
});
