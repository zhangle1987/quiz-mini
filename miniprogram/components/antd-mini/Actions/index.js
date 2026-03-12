// @ts-nocheck
import { Component, triggerEvent } from '../_util/simply';
import { ActionsProps } from './props';
Component({
    props: ActionsProps,
    methods: {
        handleTapAction: function (e) {
            var action = e.currentTarget.dataset.action;
            triggerEvent(this, 'itemTap', action);
        },
    },
});
