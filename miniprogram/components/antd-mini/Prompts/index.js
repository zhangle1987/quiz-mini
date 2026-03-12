// @ts-nocheck
import { Component, triggerEventValues } from '../_util/simply';
import { PromptsProps } from './props';
Component({
    props: PromptsProps,
    methods: {
        onItemTap: function (e) {
            var _a = e.currentTarget.dataset, item = _a.item, index = _a.index;
            triggerEventValues(this, 'itemTap', [item, index], e);
        },
    },
});
