import { Component } from '../../_util/simply';
import { FormItemDefaultProps } from './props';
Component({
    props: FormItemDefaultProps,
    attached: function () {
        this.triggerEvent('ref', this);
    },
});
