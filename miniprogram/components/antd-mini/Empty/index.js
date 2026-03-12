import { Component, triggerEvent } from '../_util/simply';
import { EmptyFunctionalProps } from './props';
Component({
    props: EmptyFunctionalProps,
    methods: {
        onClickButton: function (e) {
            var item = e.currentTarget.dataset.item;
            triggerEvent(this, 'clickButton', item);
        },
    },
});
