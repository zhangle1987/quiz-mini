export function isAilpayNative() {
    // @ts-ignore
    if (typeof ac === 'object') {
        return true;
    }
    return false;
}
export function isSupport(componentName) {
    if (typeof componentName !== 'string') {
        console.error('supportInNative 的入参需要是字符串类型');
        return;
    }
    if (typeof my === 'undefined') {
        // @ts-ignore
        return wx.canIUse(componentName);
    }
    return my.canIUse(componentName);
}
export function assertAilpayNativeNotSupport(componentName) {
    if (isAilpayNative()) {
        console.error("Ant Design Mini \u6682\u4E0D\u652F\u6301\u5728 AlipayNative \u73AF\u5883\u4F7F\u7528: ".concat(componentName, " \u7EC4\u4EF6"));
    }
}
