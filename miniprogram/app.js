import { request } from "./utils/request";

const STORAGE_KEYS = {
  shareBrokerId: "shareBrokerId",
  latestUser: "latestUser",
};

App({
  onLaunch(options) {
    const apiBaseUrl = "https://test-quiz-server.romtok.com/api";
    this.globalData = {
      apiBaseUrl,
      serverOrigin: apiBaseUrl.replace(/\/api\/?$/, ""),
      appName: "保险刷题",
      user: null,
      loginAvailable: false,
      loginWarning: "",
      currentBroker: null,
      sourceBroker: null,
      defaultBroker: null,
      effectiveBroker: null,
      config: null,
    };

    this.bootstrapPromise = this.bootstrapSession(options);
  },

  onShow(options) {
    const incomingBrokerId = this.getIncomingBrokerId(options);
    if (!incomingBrokerId) {
      return;
    }

    this.bootstrapPromise = this.bootstrapSession(options);
  },

  waitForBootstrap() {
    return this.bootstrapPromise || Promise.resolve();
  },

  getIncomingBrokerId(options = {}) {
    return String(options?.query?.brokerId || "").trim();
  },

  getStoredBrokerId() {
    return String(wx.getStorageSync(STORAGE_KEYS.shareBrokerId) || "").trim();
  },

  setStoredBrokerId(brokerId) {
    const normalizedBrokerId = String(brokerId || "").trim();
    if (normalizedBrokerId) {
      wx.setStorageSync(STORAGE_KEYS.shareBrokerId, normalizedBrokerId);
      return;
    }

    wx.removeStorageSync(STORAGE_KEYS.shareBrokerId);
  },

  async getLoginCode() {
    return new Promise((resolve) => {
      wx.login({
        success: (result) => resolve(result.code || ""),
        fail: () => resolve(""),
      });
    });
  },

  async bootstrapSession(options) {
    const incomingBrokerId = this.getIncomingBrokerId(options);
    const storedBrokerId = this.getStoredBrokerId();
    const code = await this.getLoginCode();

    try {
      const response = await request({
        url: "/auth/bootstrap",
        method: "POST",
        data: {
          code,
          incomingBrokerId,
          storedBrokerId,
        },
      });

      this.globalData.user = response.user || null;
      this.globalData.loginAvailable = Boolean(response.loginAvailable);
      this.globalData.loginWarning = response.loginWarning || "";
      this.globalData.currentBroker = response.currentBroker || null;
      this.globalData.sourceBroker = response.sourceBroker || null;
      this.globalData.defaultBroker = response.defaultBroker || null;
      this.globalData.effectiveBroker = response.effectiveBroker || null;
      this.globalData.config = response.config || null;

      const persistedBrokerId = response.sourceBroker?.brokerId
        || response.defaultBroker?.brokerId
        || "";
      this.setStoredBrokerId(persistedBrokerId);

      if (response.user) {
        wx.setStorageSync(STORAGE_KEYS.latestUser, response.user);
      }

      return response;
    } catch (error) {
      this.globalData.loginWarning = error?.message || "启动失败";
      this.globalData.loginAvailable = false;
      this.globalData.user = wx.getStorageSync(STORAGE_KEYS.latestUser) || null;
      this.globalData.currentBroker = null;
      this.globalData.sourceBroker = storedBrokerId ? { brokerId: storedBrokerId } : null;
      this.globalData.defaultBroker = null;
      this.globalData.effectiveBroker = this.globalData.sourceBroker;
      return null;
    }
  },

  getShareBrokerId() {
    return this.globalData.currentBroker?.brokerId
      || this.globalData.sourceBroker?.brokerId
      || this.globalData.defaultBroker?.brokerId
      || "";
  },

  createShareOptions(options = {}) {
    const path = options.path || "/pages/index/index";
    const brokerId = this.getShareBrokerId();
    const separator = path.includes("?") ? "&" : "?";
    const sharePath = brokerId
      ? `${path}${separator}brokerId=${encodeURIComponent(brokerId)}`
      : path;

    return {
      title: options.title || this.globalData.appName,
      path: sharePath,
      imageUrl: options.imageUrl,
    };
  },
});
