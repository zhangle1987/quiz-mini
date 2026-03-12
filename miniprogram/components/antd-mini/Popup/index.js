var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { isOldSDKVersion } from '../_util/platform';
import { Component, getValueFromProps, triggerEventOnly, } from '../_util/simply';
import { PopupDefaultProps } from './props';
var isOldVersion = isOldSDKVersion();
Component({
    props: PopupDefaultProps,
    data: {
        closing: false,
        isOldVersion: isOldVersion,
    },
    methods: {
        onClickCloseIcon: function () {
            var closing = this.data.closing;
            if (closing) {
                return;
            }
            triggerEventOnly(this, 'close');
        },
        onClickBack: function () {
            triggerEventOnly(this, 'clickBack');
        },
        onTapMask: function () {
            var closing = this.data.closing;
            if (closing) {
                return;
            }
            triggerEventOnly(this, 'close');
        },
        onAnimationEnd: function () {
            var closing = this.data.closing;
            if (closing) {
                this.setData({ closing: false });
            }
            var _a = getValueFromProps(this, [
                'visible',
                'duration',
                'animation',
            ]), visible = _a[0], duration = _a[1], animation = _a[2];
            var enableAnimation = animation && (duration > 0 || typeof duration !== 'number');
            if (enableAnimation) {
                triggerEventOnly(this, visible ? 'afterShow' : 'afterClose');
            }
        },
    },
    observers: {
        '**': function (data) {
            var prevData = this._prevData || this.data;
            this._prevData = __assign({}, data);
            var visible = data.visible, duration = data.duration, animation = data.animation, closing = data.closing;
            var enableAnimation = animation && (duration > 0 || typeof duration !== 'number');
            if (enableAnimation &&
                prevData.visible !== data.visible &&
                !visible &&
                !closing) {
                this.setData({ closing: true });
            }
            if (prevData.visible !== data.visible && !enableAnimation) {
                triggerEventOnly(this, visible ? 'afterShow' : 'afterClose');
            }
        },
    },
});
