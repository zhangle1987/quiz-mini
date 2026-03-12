import mixinValue from '../../mixins/value';
import { Component, getValueFromProps, triggerEvent } from '../../_util/simply';
import { RadioGroupDefaultProps } from './props';
Component({
    props: RadioGroupDefaultProps,
    methods: {
        onChange: function (_, e) {
            var event;
            event = _;
            var index = event.currentTarget.dataset.index;
            var options = getValueFromProps(this, 'options');
            var value = options[index].value;
            if (!this.isControlled()) {
                this.update(value);
            }
            triggerEvent(this, 'change', value, event);
        },
    },
    mixins: [mixinValue()],
});
