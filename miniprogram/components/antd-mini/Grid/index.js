import { Component, triggerEvent } from '../_util/simply';
import { GridFunctionalProps } from './props';
Component({
    props: GridFunctionalProps,
    methods: {
        onTap: function (e) {
            var item = e.currentTarget.dataset.item;
            triggerEvent(this, 'tap', item);
        },
        onFirstAppear: function (e) {
            var item = e.currentTarget.dataset.item;
            triggerEvent(this, 'firstAppear', item);
        },
    },
});
