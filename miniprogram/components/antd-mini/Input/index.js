import { effect } from '@preact/signals-core';
import mixinValue from '../mixins/value';
import { ComponentWithSignalStoreImpl, getValueFromProps, triggerEvent, } from '../_util/simply';
import i18nController from '../_util/store';
import { assertAilpayNativeNotSupport } from '../_util/support';
import { InputDefaultProps } from './props';
import { formatNumberWithLimits, isNumber } from './utils';
assertAilpayNativeNotSupport('Input');
ComponentWithSignalStoreImpl({
    storeOptions: {
        store: function () { return i18nController; },
        updateHook: effect,
        mapState: {
            locale: function (_a) {
                var store = _a.store;
                return store.currentLocale.value;
            },
        },
    },
    props: InputDefaultProps,
    data: {
        selfFocus: false,
    },
    methods: {
        onChange: function (e) {
            var value = e.detail.value;
            if (!this.isControlled()) {
                this.update(value);
            }
            triggerEvent(this, 'change', value, e);
        },
        onFocus: function (e) {
            var value = e.detail.value;
            this.setData({
                selfFocus: true,
            });
            triggerEvent(this, 'focus', value, e);
        },
        onBlur: function (e) {
            var value = e.detail.value;
            this.setData({
                selfFocus: false,
            });
            var val = this.checkNumberValue(value);
            if (val !== null) {
                if (val !== value && !this.isControlled()) {
                    this.update(val);
                }
                value = val;
            }
            triggerEvent(this, 'blur', value, e);
        },
        onConfirm: function (e) {
            var value = e.detail.value;
            triggerEvent(this, 'confirm', value, e);
        },
        onClear: function (e) {
            if (!this.isControlled()) {
                this.update('');
            }
            triggerEvent(this, 'change', '', e);
        },
        checkNumberValue: function (value) {
            var _a = getValueFromProps(this, [
                'type',
                'max',
                'min',
                'precision',
            ]), type = _a[0], max = _a[1], min = _a[2], precision = _a[3];
            var NUMBER_KEYBOARD = ['number', 'digit', 'numberpad', 'digitpad'];
            if (NUMBER_KEYBOARD.indexOf(type) !== -1 &&
                isNumber(value) &&
                isNumber(max) &&
                isNumber(min)) {
                return formatNumberWithLimits(value, max, min, precision);
            }
            return null;
        },
    },
    mixins: [mixinValue({ scopeKey: 'state' })],
    attached: function () {
        this.triggerEvent('ref', this);
    },
});
