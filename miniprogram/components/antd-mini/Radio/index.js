import mixinValue from '../mixins/value';
import { Component, triggerEvent } from '../_util/simply';
import { isAilpayNative } from '../_util/support';
import { RadioDefaultProps } from './props';
Component({
    data: {
        isLabelSupport: true,
    },
    props: RadioDefaultProps,
    onInit: function () {
        this.setData({
            isLabelSupport: !isAilpayNative(),
        });
    },
    methods: {
        handleTap: function (e) {
            // 只能从 false -> true
            if (this.getValue()) {
                return;
            }
            if (!this.isControlled()) {
                this.update(true);
            }
            triggerEvent(this, 'change', true, e);
        },
    },
    mixins: [
        mixinValue({
            valueKey: 'checked',
            defaultValueKey: 'defaultChecked',
        }),
    ],
});
