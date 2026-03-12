Page({
  data: {
    result: null,
    broker: null,
  },

  onShow() {
    const result = wx.getStorageSync("latestQuizResult");
    if (!result) {
      wx.showToast({
        title: "暂无答题结果",
        icon: "none",
      });
      return;
    }

    this.setData({
      result,
      broker: result.broker || null,
    });
  },

  backHome() {
    wx.navigateBack({
      delta: 2,
    });
  },

  previewBrokerQr() {
    if (!this.data.broker?.qrImageUrl) {
      return;
    }

    wx.previewImage({
      current: this.data.broker.qrImageUrl,
      urls: [this.data.broker.qrImageUrl],
    });
  },

  onShareAppMessage() {
    return getApp().createShareOptions({
      title: `${this.data.result?.paper?.title || "保险刷题"}，一起来练习`,
      path: "/pages/index/index",
    });
  },
});
