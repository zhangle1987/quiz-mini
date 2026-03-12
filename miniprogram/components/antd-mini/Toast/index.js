import { Component, getValueFromProps, triggerEventOnly, } from '../_util/simply';
import { ToastDefaultProps } from './props';
Component({
    props: ToastDefaultProps,
    data: {
        show: false,
        closing: false,
    },
    timer: null,
    methods: {
        closeMask: function () {
            var closing = this.data.closing;
            if (closing) {
                return;
            }
            if (this.timer) {
                clearTimeout(this.timer);
            }
            this.setData({ show: false, closing: true });
            this.timer = null;
            triggerEventOnly(this, 'close');
        },
        handleShowToast: function () {
            var _this = this;
            this.setData({ show: true, closing: false });
            var duration = getValueFromProps(this, 'duration');
            if (duration > 0) {
                var timer = setTimeout(function () {
                    _this.closeMask();
                }, duration);
                this.timer = timer;
            }
        },
        handleClickMask: function () {
            var _a = getValueFromProps(this, [
                'showMask',
                'maskCloseable',
            ]), showMask = _a[0], maskCloseable = _a[1];
            if (showMask && maskCloseable) {
                this.closeMask();
            }
        },
        onAnimationEnd: function () {
            if (this.data.closing) {
                this.setData({ show: false, closing: false });
                this.timer = null;
                triggerEventOnly(this, 'close');
            }
        },
    },
    observers: {
        'visible': function (visible) {
            if (visible) {
                this.handleShowToast();
            }
            else if (!visible && this.data.show) {
                this.closeMask();
            }
        },
        'content': function (content) {
            this.setData({
                displayContent: content === 'string' ? content.substring(0, 24) : content,
            });
        },
    },
    attached: function () {
        var visible = getValueFromProps(this, 'visible');
        if (visible) {
            this.handleShowToast();
        }
    },
});
