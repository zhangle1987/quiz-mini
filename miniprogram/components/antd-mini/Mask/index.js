import { Component, triggerEventOnly } from '../_util/simply';
Component({
    props: {
        show: true,
    },
    methods: {
        onMaskTap: function (e) {
            triggerEventOnly(this, 'maskTap', e);
        },
    },
});
