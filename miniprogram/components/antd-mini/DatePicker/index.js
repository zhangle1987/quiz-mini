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
import dayjs from 'dayjs';
import equal from '../_util/fast-deep-equal';
import mixinValue from '../mixins/value';
import { resolveEventValue, resolveEventValues } from '../_util/platform';
import { Component, getValueFromProps, triggerEvent, triggerEventOnly, triggerEventValues, } from '../_util/simply';
import { assertAilpayNativeNotSupport } from '../_util/support';
import { DatePickerDefaultProps } from './props';
import { getDateByValue, getRangeData, getValidValue, getValueByDate, } from './util';
assertAilpayNativeNotSupport('DatePicker');
Component({
    props: DatePickerDefaultProps,
    data: {
        currentValue: [],
        formattedValueText: '',
        columns: [],
        forceUpdate: 0,
        visible: null,
    },
    pickerVisible: false,
    methods: {
        // visible受控判断
        isVisibleControlled: function () {
            return getValueFromProps(this, 'visible') !== null;
        },
        // 当前选中的picker值，处理无cValue时的情况，优先取当前时间，不在时间范围内取开始时间
        getCurrentValueWithCValue: function (currentProps) {
            var realValue = this.getValue();
            var min = currentProps.min, max = currentProps.max, precision = currentProps.precision, defaultPickerValue = currentProps.defaultPickerValue;
            if (realValue) {
                return getValueByDate(realValue, precision);
            }
            // 处理默认值
            var baseDate = null;
            if (defaultPickerValue) {
                try {
                    // 判断defaultPickerValue用户配置格式
                    var defaultDate = dayjs(defaultPickerValue, [
                        'YYYY-MM-DD',
                        'YYYY/MM/DD',
                        'HH:mm:ss',
                        'HH:mm',
                        'HH',
                    ]);
                    if (!defaultDate.isValid() &&
                        typeof defaultPickerValue === 'string' &&
                        defaultPickerValue.includes(':')) {
                        var _a = defaultPickerValue
                            .split(':')
                            .map(Number), hours = _a[0], minutes = _a[1], seconds = _a[2];
                        var now = dayjs();
                        defaultDate = now
                            .set('hour', hours || 0)
                            .set('minute', minutes || 0)
                            .set('second', seconds || 0);
                    }
                    baseDate = defaultDate.isValid() ? defaultDate.toDate() : new Date();
                }
                catch (e) {
                    baseDate = new Date();
                }
            }
            else {
                // 没有 defaultPickerValue 时，回退原逻辑
                var now = new Date();
                var minDayjs_1 = this.getMin(min);
                var maxDayjs_1 = this.getMax(max);
                if (dayjs(now).isBefore(minDayjs_1) || dayjs(now).isAfter(maxDayjs_1)) {
                    baseDate = minDayjs_1.toDate();
                }
                else {
                    baseDate = now;
                }
            }
            // 获取最大最小日期
            var minDayjs = this.getMin(min);
            var maxDayjs = this.getMax(max);
            // 校验日期
            var adjustedDate = dayjs(baseDate);
            // 强制对齐
            if (adjustedDate.isBefore(minDayjs)) {
                adjustedDate = minDayjs;
            }
            else if (adjustedDate.isAfter(maxDayjs)) {
                adjustedDate = maxDayjs;
            }
            return getValueByDate(adjustedDate.toDate(), precision);
        },
        getMin: function (min) {
            return min ? dayjs(min) : dayjs().subtract(10, 'year');
        },
        getMax: function (max) {
            return max ? dayjs(max) : dayjs().add(10, 'year');
        },
        /**
         * didUpdate、弹窗打开触发
         */
        setCurrentValue: function (currentProps) {
            var _this = this;
            var currentValue = this.getCurrentValueWithCValue(currentProps);
            var newColumns = this.generateData(currentValue, currentProps);
            if (!equal(newColumns, this.data.columns)) {
                this.setData({
                    columns: newColumns,
                }, function () {
                    _this.setData({
                        currentValue: currentValue,
                        formattedValueText: _this.onFormat(),
                    });
                });
                return;
            }
            this.setData({
                currentValue: currentValue,
                formattedValueText: this.onFormat(),
            });
        },
        // 生成选项数据，didmound、picker change、打开弹窗触发
        generateData: function (currentValue, currentProps) {
            var precision = currentProps.precision, propsMin = currentProps.min, propsMax = currentProps.max;
            var min = this.getMin(propsMin);
            var max = this.getMax(propsMax);
            if (max < min) {
                return [];
            }
            var currentPickerDay = dayjs();
            if (currentValue.length > 0) {
                currentPickerDay = dayjs(getDateByValue(currentValue));
            }
            if (currentPickerDay < min || currentPickerDay > max) {
                currentPickerDay = min;
            }
            var newColumns = getRangeData(precision, min, max, currentPickerDay, this.onFormatLabel.bind(this));
            return newColumns;
        },
        onFormatLabel: function (type, value) {
            var onFormatLabel = getValueFromProps(this, 'onFormatLabel');
            var formatValueByProps = onFormatLabel && onFormatLabel(type, value);
            if (formatValueByProps !== undefined && formatValueByProps !== null) {
                return String(formatValueByProps);
            }
            return this.defaultFormatLabel(type, value);
        },
        defaultFormatLabel: function (type, value) {
            var suffixMap = {
                year: '年',
                month: '月',
                day: '日',
                hour: '时',
                minute: '分',
                second: '秒',
            };
            return "".concat(value).concat(suffixMap[type]);
        },
        onChange: function (selectedIdx) {
            var _this = this;
            var _a = getValueFromProps(this, [
                'min',
                'max',
                'format',
                'precision',
            ]), pmin = _a[0], pmax = _a[1], format = _a[2], precision = _a[3];
            var selectedIndex = resolveEventValues(getValidValue(selectedIdx))[0];
            var date = getDateByValue(selectedIndex);
            var min = this.getMin(pmin);
            var max = this.getMax(pmax);
            if (dayjs(date).isBefore(min)) {
                date = min.toDate();
                selectedIndex = getValueByDate(date, precision);
            }
            if (dayjs(date).isAfter(max)) {
                date = max.toDate();
                selectedIndex = getValueByDate(date, precision);
            }
            var newColumns = this.generateData(selectedIndex, getValueFromProps(this));
            if (!equal(newColumns, this.data.columns)) {
                this.setData({
                    columns: newColumns,
                }, function () {
                    _this.setData({ currentValue: selectedIndex });
                    var date = getDateByValue(selectedIndex);
                    triggerEventValues(_this, 'pickerChange', [
                        date,
                        dayjs(date).format(format),
                    ]);
                });
            }
            else {
                this.setData({ currentValue: selectedIndex });
                var date_1 = getDateByValue(selectedIndex);
                triggerEventValues(this, 'pickerChange', [
                    date_1,
                    dayjs(date_1).format(format),
                ]);
            }
        },
        onCancel: function (e) {
            triggerEventOnly(this, 'cancel', e);
        },
        onOk: function () {
            var currentValue = this.data.currentValue;
            var format = getValueFromProps(this, 'format');
            var date = getDateByValue(currentValue);
            if (!this.isControlled()) {
                this.update(date);
            }
            triggerEventValues(this, 'ok', [date, dayjs(date).format(format)]);
        },
        defaultFormat: function (value, valueStr) {
            var format = getValueFromProps(this, 'format');
            if (format && valueStr) {
                return valueStr;
            }
            return '';
        },
        onFormat: function () {
            var _a = getValueFromProps(this, [
                'format',
                'onFormat',
            ]), format = _a[0], onFormat = _a[1];
            var realValue = this.getValue();
            var formatValueByProps = onFormat &&
                onFormat(realValue, realValue ? dayjs(realValue).format(format) : null);
            if (formatValueByProps !== undefined && formatValueByProps !== null) {
                return formatValueByProps;
            }
            return this.defaultFormat(realValue, realValue ? dayjs(realValue).format(format) : null);
        },
        onVisibleChange: function (visible) {
            this.pickerVisible = visible;
            if (!this.isVisibleControlled() && visible) {
                this.setCurrentValue(getValueFromProps(this));
            }
            triggerEvent(this, 'visibleChange', resolveEventValue(visible));
        },
    },
    mixins: [
        mixinValue({
            transformValue: function (value) {
                return {
                    value: value ? dayjs(value).toDate() : undefined,
                    needUpdate: true,
                };
            },
        }),
    ],
    created: function () {
        this.pickerVisible = false;
        var _a = getValueFromProps(this, [
            'visible',
            'defaultVisible',
        ]), visible = _a[0], defaultVisible = _a[1];
        this.setData({
            visible: this.isVisibleControlled() ? visible : defaultVisible,
            formattedValueText: this.onFormat(),
        });
    },
    observers: {
        '**': function (data) {
            var prevData = this._prevData || this.data;
            this._prevData = __assign({}, data);
            if (!equal(prevData, data)) {
                if (this.pickerVisible) {
                    this.setCurrentValue(getValueFromProps(this));
                }
            }
        },
        'mixin.value': function () {
            this.setData({
                forceUpdate: this.data.forceUpdate + 1,
                formattedValueText: this.onFormat(),
            });
            // 展开状态才更新picker的数据，否则下次triggerVisible触发
            if (this.pickerVisible) {
                this.setCurrentValue(getValueFromProps(this));
            }
        },
        'visible': function (data) {
            var prevVisible = this._prevVisible;
            this._prevVisible = data;
            var currentProps = getValueFromProps(this);
            var visible = getValueFromProps(this, 'visible');
            if (this.isVisibleControlled() && prevVisible !== visible) {
                this.pickerVisible = visible;
                this.setData({
                    visible: visible,
                });
                if (this.pickerVisible) {
                    this.setCurrentValue(currentProps);
                }
            }
        },
    },
});
