import { Component, triggerEvent } from '../_util/simply';
import { DefaultProps } from './props';
Component({
    props: DefaultProps,
    methods: {
        onTapLink: function (e) {
            var item = e.currentTarget.dataset.item;
            triggerEvent(this, 'linkTap', item, e);
        },
        onTapChip: function (e) {
            var item = e.currentTarget.dataset.item;
            triggerEvent(this, 'chipTap', item, e);
        },
    },
});
