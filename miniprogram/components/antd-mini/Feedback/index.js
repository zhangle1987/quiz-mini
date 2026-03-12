import { resolveEventValue } from '../_util/platform';
import { Component, triggerEvent } from '../_util/simply';
import { assertAilpayNativeNotSupport } from '../_util/support';
import { FeedbackDefaultProps } from './props';
assertAilpayNativeNotSupport('Feedback');
Component({
    props: FeedbackDefaultProps,
    methods: {
        handleVisibleChange: function (visible, e) {
            triggerEvent(this, 'visibleChange', resolveEventValue(visible), e);
        },
        onTapFeedItem: function (e) {
            var item = e.currentTarget.dataset.item;
            triggerEvent(this, 'tapFeedItem', item, e);
        },
        maskClick: function (e) {
            triggerEvent(this, 'visibleChange', true, e);
        },
    },
});
