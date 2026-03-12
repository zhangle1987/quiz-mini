import { request } from "./utils/request";

const STORAGE_KEYS = {
  shareBrokerId: "shareBrokerId",
  sourceBrokerId: "sourceBrokerId",
  latestUser: "latestUser",
};

App({
  onLaunch(options) {
    const apiBaseUrl = "https://test-quiz-server.romtok.com/api";
    // const apiBaseUrl = "http://127.0.0.1:3000/api";
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
      sourceBrokerId: "",
      shareBrokerId: "",
      config: null,
      preloadedQuiz: null,
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
    return String(
      wx.getStorageSync(STORAGE_KEYS.sourceBrokerId)
      || wx.getStorageSync(STORAGE_KEYS.shareBrokerId)
      || "",
    ).trim();
  },

  setStoredBrokerId(brokerId) {
    const normalizedBrokerId = String(brokerId || "").trim();
    if (normalizedBrokerId) {
      wx.setStorageSync(STORAGE_KEYS.sourceBrokerId, normalizedBrokerId);
      wx.setStorageSync(STORAGE_KEYS.shareBrokerId, normalizedBrokerId);
      return;
    }

    wx.removeStorageSync(STORAGE_KEYS.sourceBrokerId);
    wx.removeStorageSync(STORAGE_KEYS.shareBrokerId);
  },

  applyBrokerResolution(payload = {}, fallbackSourceBrokerId = "") {
    this.globalData.currentBroker = payload.currentBroker || null;
    this.globalData.sourceBroker = payload.sourceBroker || null;
    this.globalData.defaultBroker = payload.defaultBroker || null;
    this.globalData.effectiveBroker = payload.effectiveBroker || null;
    this.globalData.config = payload.config || null;

    const sourceBrokerId = String(
      payload.sourceBroker?.brokerId
      || payload.defaultBroker?.brokerId
      || fallbackSourceBrokerId
      || "",
    ).trim();
    const shareBrokerId = String(
      payload.currentBroker?.brokerId
      || sourceBrokerId
      || payload.defaultBroker?.brokerId
      || "",
    ).trim();

    this.globalData.sourceBrokerId = sourceBrokerId;
    this.globalData.shareBrokerId = shareBrokerId;
    this.setStoredBrokerId(sourceBrokerId);
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
      this.applyBrokerResolution(response, storedBrokerId);

      if (response.user) {
        wx.setStorageSync(STORAGE_KEYS.latestUser, response.user);
      }

      return response;
    } catch (error) {
      this.globalData.loginWarning = error?.message || "启动失败";
      this.globalData.loginAvailable = false;
      this.globalData.user = wx.getStorageSync(STORAGE_KEYS.latestUser) || null;
      this.applyBrokerResolution({
        currentBroker: null,
        sourceBroker: storedBrokerId ? { brokerId: storedBrokerId } : null,
        defaultBroker: null,
        effectiveBroker: storedBrokerId ? { brokerId: storedBrokerId } : null,
        config: this.globalData.config,
      }, storedBrokerId);
      return null;
    }
  },

  async getCurrentOpenId({ forceRefresh = false } = {}) {
    const cachedOpenId = String(this.globalData.user?.openid || "").trim();
    if (cachedOpenId && !forceRefresh) {
      return {
        openid: cachedOpenId,
        loginAvailable: this.globalData.loginAvailable,
        loginWarning: this.globalData.loginWarning,
      };
    }

    const code = await this.getLoginCode();
    if (!code) {
      return {
        openid: "",
        loginAvailable: this.globalData.loginAvailable,
        loginWarning: "未获取到登录 code",
      };
    }

    try {
      const response = await request({
        url: "/auth/login",
        method: "POST",
        data: { code },
      });

      this.globalData.user = response.user || this.globalData.user || null;
      this.globalData.loginAvailable = Boolean(response.loginAvailable);
      this.globalData.loginWarning = response.loginWarning || "";
      this.globalData.currentBroker = response.currentBroker || this.globalData.currentBroker || null;
      this.globalData.shareBrokerId = String(
        this.globalData.currentBroker?.brokerId
        || this.globalData.sourceBrokerId
        || this.globalData.defaultBroker?.brokerId
        || "",
      ).trim();

      return {
        openid: String(response.user?.openid || "").trim(),
        loginAvailable: this.globalData.loginAvailable,
        loginWarning: this.globalData.loginWarning,
      };
    } catch (error) {
      return {
        openid: "",
        loginAvailable: this.globalData.loginAvailable,
        loginWarning: error?.message || "获取 OpenID 失败",
      };
    }
  },

  getShareBrokerId() {
    return this.globalData.shareBrokerId
      || this.globalData.currentBroker?.brokerId
      || this.globalData.sourceBrokerId
      || this.globalData.sourceBroker?.brokerId
      || this.getStoredBrokerId()
      || this.globalData.defaultBroker?.brokerId
      || "";
  },

  setPreloadedQuiz(payload) {
    this.globalData.preloadedQuiz = payload
      ? {
        ...payload,
        fetchedAt: Date.now(),
      }
      : null;
  },

  takePreloadedQuiz(paperId) {
    const preload = this.globalData.preloadedQuiz;
    if (!preload) {
      return null;
    }

    const isFresh = Date.now() - Number(preload.fetchedAt || 0) <= 2 * 60 * 1000;
    const matchesPaper = String(preload.paperId || "") === String(paperId || "");
    if (!isFresh || !matchesPaper) {
      this.globalData.preloadedQuiz = null;
      return null;
    }

    this.globalData.preloadedQuiz = null;
    return preload.response || null;
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
