import mixinValue from '../mixins/value';
import { Component, triggerEvent } from '../_util/simply';
import { TabBarDefaultProps } from './props';
Component({
    props: TabBarDefaultProps,
    methods: {
        onChange: function (e) {
            var index = e.currentTarget.dataset.index;
            if (index === this.getValue()) {
                return;
            }
            if (!this.isControlled()) {
                this.update(index);
            }
            triggerEvent(this, 'change', index, e);
        },
    },
    mixins: [
        mixinValue({
            valueKey: 'current',
            defaultValueKey: 'defaultCurrent',
        }),
    ],
});
