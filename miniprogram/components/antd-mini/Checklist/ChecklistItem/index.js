import { Component, getValueFromProps, triggerEvent } from '../../_util/simply';
import { ChecklistItemDefaultProps } from './props';
Component({
    props: ChecklistItemDefaultProps,
    methods: {
        onChecklistItemClick: function () {
            triggerEvent(this, 'change', getValueFromProps(this, 'item'));
        },
    },
});
