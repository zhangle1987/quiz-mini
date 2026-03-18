import { request } from "./utils/request";

const STORAGE_KEYS = {
  shareBrokerId: "shareBrokerId",
  sourceBrokerId: "sourceBrokerId",
  latestUser: "latestUser",
  latestQuizAttempt: "latestQuizAttempt",
  activeQuizSession: "activeQuizSession",
  latestAttemptViewState: "latestAttemptViewState",
};

App({
  onLaunch(options) {
    const apiBaseUrl = "https://iiqe.orangator.com/api";
    // const apiBaseUrl = "http://10.0.0.247:3000/api";
    this.globalData = {
      apiBaseUrl,
      serverOrigin: apiBaseUrl.replace(/\/api\/?$/, ""),
      appName: "保險刷題",
      user: null,
      loginAvailable: false,
      loginWarning: "",
      sourceBroker: null,
      defaultBroker: null,
      effectiveBroker: null,
      sourceBrokerId: "",
      shareBrokerId: "",
      config: null,
      preloadedQuiz: null,
      latestAttemptPreview: null,
      latestAttemptDismissedId: "",
      activeQuizSession: wx.getStorageSync(STORAGE_KEYS.activeQuizSession) || null,
      activeQuizDismissedId: "",
    };

    this.bootstrapPromise = this.bootstrapSession(options);
  },

  onShow(options) {
    this.globalData.latestAttemptDismissedId = "";
    this.globalData.activeQuizDismissedId = "";
    this.bootstrapPromise = this.bootstrapSession(options);
  },

  waitForBootstrap() {
    return this.bootstrapPromise || Promise.resolve();
  },

  getBrokerIdFromScene(sceneValue = "") {
    const rawScene = String(sceneValue || "").trim();
    if (!rawScene) {
      return "";
    }

    let decodedScene = rawScene;
    try {
      decodedScene = decodeURIComponent(rawScene);
    } catch {
      decodedScene = rawScene;
    }

    if (decodedScene.startsWith("i=")) {
      return decodedScene.slice(2).trim();
    }
    
    return "";
  },

  getIncomingBrokerEntry(options = {}) {
    const queryBrokerRef = String(options?.query?.broker || "").trim();
    if (queryBrokerRef) {
      return {
        brokerId: queryBrokerRef,
        sourceType: "query",
      };
    }

    const sceneBrokerId = this.getBrokerIdFromScene(options?.query?.scene);
    if (sceneBrokerId) {
      return {
        brokerId: sceneBrokerId,
        sourceType: "scene",
      };
    }

    return {
      brokerId: "",
      sourceType: "",
    };
  },

  getStoredBrokerId() {
    return String(wx.getStorageSync(STORAGE_KEYS.sourceBrokerId) || "").trim();
  },

  setStoredBrokerId(brokerId) {
    const normalizedBrokerId = String(brokerId || "").trim();
    if (normalizedBrokerId) {
      wx.setStorageSync(STORAGE_KEYS.sourceBrokerId, normalizedBrokerId);
      wx.removeStorageSync(STORAGE_KEYS.shareBrokerId);
      return;
    }

    wx.removeStorageSync(STORAGE_KEYS.sourceBrokerId);
    wx.removeStorageSync(STORAGE_KEYS.shareBrokerId);
  },

  applyBrokerResolution(payload = {}, fallbackSourceBrokerId = "") {
    this.globalData.sourceBroker = payload.sourceBroker || null;
    this.globalData.defaultBroker = payload.defaultBroker || null;
    this.globalData.effectiveBroker = payload.effectiveBroker || null;
    this.globalData.config = payload.config || null;

    const sourceBrokerId = String(
      payload.sourceBroker?.id
      || fallbackSourceBrokerId
      || "",
    ).trim();
    const shareBrokerId = String(
      sourceBrokerId
      || payload.defaultBroker?.id
      || "",
    ).trim();

    this.globalData.sourceBrokerId = sourceBrokerId;
    this.globalData.shareBrokerId = shareBrokerId;
    this.setStoredBrokerId(sourceBrokerId);
  },

  setLatestAttemptPreview(preview) {
    const normalizedPreview = preview && preview.id
      ? {
        ...preview,
      }
      : null;
    const currentId = String(this.globalData.latestAttemptPreview?.id || "").trim();
    const nextId = String(normalizedPreview?.id || "").trim();
    if (currentId !== nextId) {
      this.globalData.latestAttemptDismissedId = "";
    }
    this.globalData.latestAttemptPreview = normalizedPreview;
  },

  getLatestAttemptViewStateRecord() {
    const record = wx.getStorageSync(STORAGE_KEYS.latestAttemptViewState) || null;
    return record && typeof record === "object" ? record : null;
  },

  getLatestAttemptViewState(attemptId = "") {
    const normalizedAttemptId = String(attemptId || "").trim();
    if (!normalizedAttemptId) {
      return "";
    }

    const record = this.getLatestAttemptViewStateRecord();
    if (!record || String(record.id || "").trim() !== normalizedAttemptId) {
      return "";
    }

    return String(record.state || "").trim();
  },

  setLatestAttemptViewState(attemptId = "", state = "") {
    const normalizedAttemptId = String(attemptId || "").trim();
    const normalizedState = String(state || "").trim();
    if (!normalizedAttemptId || !normalizedState) {
      wx.removeStorageSync(STORAGE_KEYS.latestAttemptViewState);
      return;
    }

    wx.setStorageSync(STORAGE_KEYS.latestAttemptViewState, {
      id: normalizedAttemptId,
      state: normalizedState,
    });
  },

  markLatestAttemptViewed(attempt) {
    const attemptId = String(attempt?.id || "").trim();
    if (!attemptId) {
      return;
    }

    const state = attempt?.access?.canViewAnswers ? "unlocked" : "locked";
    this.setLatestAttemptViewState(attemptId, state);
  },

  cacheLatestAttempt(attempt) {
    if (!attempt?.id) {
      wx.removeStorageSync(STORAGE_KEYS.latestQuizAttempt);
      this.setLatestAttemptPreview(null);
      this.setLatestAttemptViewState("", "");
      return;
    }

    wx.setStorageSync(STORAGE_KEYS.latestQuizAttempt, attempt);
    this.setLatestAttemptPreview({
      id: attempt.id,
      paper: attempt.paper || null,
      access: attempt.access || null,
      createdAt: attempt.createdAt || "",
    });
  },

  getCachedLatestAttempt() {
    return wx.getStorageSync(STORAGE_KEYS.latestQuizAttempt) || null;
  },

  consumeLatestAttemptForAutoOpen() {
    const preview = this.globalData.latestAttemptPreview;
    const previewId = String(preview?.id || "").trim();
    if (!previewId || this.globalData.latestAttemptDismissedId === previewId) {
      return null;
    }

    const canViewAnswers = Boolean(preview?.access?.canViewAnswers);
    if (canViewAnswers && this.getLatestAttemptViewState(previewId) !== "locked") {
      return null;
    }

    this.globalData.latestAttemptDismissedId = previewId;
    return preview;
  },

  dismissLatestAttempt(attemptId = "") {
    this.globalData.latestAttemptDismissedId = String(attemptId || "").trim();
  },

  setActiveQuizSession(session, options = {}) {
    const { markHandled = false } = options;
    if (!session?.id || !session?.paper?.id || !Array.isArray(session.questions) || !session.questions.length) {
      wx.removeStorageSync(STORAGE_KEYS.activeQuizSession);
      this.globalData.activeQuizSession = null;
      this.globalData.activeQuizDismissedId = "";
      return;
    }

    const normalizedSession = {
      ...session,
    };
    this.globalData.activeQuizSession = normalizedSession;
    wx.setStorageSync(STORAGE_KEYS.activeQuizSession, normalizedSession);
    this.globalData.activeQuizDismissedId = markHandled ? normalizedSession.id : "";
  },

  getActiveQuizSession() {
    if (this.globalData.activeQuizSession?.id) {
      return this.globalData.activeQuizSession;
    }

    const storedSession = wx.getStorageSync(STORAGE_KEYS.activeQuizSession) || null;
    this.globalData.activeQuizSession = storedSession?.id ? storedSession : null;
    return this.globalData.activeQuizSession;
  },

  clearActiveQuizSession() {
    wx.removeStorageSync(STORAGE_KEYS.activeQuizSession);
    this.globalData.activeQuizSession = null;
    this.globalData.activeQuizDismissedId = "";
  },

  consumeActiveQuizSessionForAutoOpen() {
    const session = this.getActiveQuizSession();
    const sessionId = String(session?.id || "").trim();
    if (!sessionId || this.globalData.activeQuizDismissedId === sessionId) {
      return null;
    }

    this.globalData.activeQuizDismissedId = sessionId;
    return session;
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
    const incomingBrokerEntry = this.getIncomingBrokerEntry(options);
    const incomingBrokerId = incomingBrokerEntry.brokerId;
    const storedBrokerId = this.getStoredBrokerId();
    const code = await this.getLoginCode();

    try {
      const response = await request({
        url: "/auth/bootstrap",
        method: "POST",
        data: {
          code,
          incomingBrokerId,
          incomingBrokerSource: incomingBrokerEntry.sourceType,
          storedBrokerId,
        },
      });

      this.globalData.user = response.user || null;
      this.globalData.loginAvailable = Boolean(response.loginAvailable);
      this.globalData.loginWarning = response.loginWarning || "";
      this.applyBrokerResolution(response, storedBrokerId);
      this.setLatestAttemptPreview(response.latestAttempt || null);

      if (response.user) {
        wx.setStorageSync(STORAGE_KEYS.latestUser, response.user);
      }

      return response;
    } catch (error) {
      this.globalData.loginWarning = error?.message || "啟動失敗";
      this.globalData.loginAvailable = false;
      this.globalData.user = wx.getStorageSync(STORAGE_KEYS.latestUser) || null;
      this.applyBrokerResolution({
        sourceBroker: storedBrokerId ? { id: storedBrokerId } : null,
        defaultBroker: null,
        effectiveBroker: storedBrokerId ? { id: storedBrokerId } : null,
        config: this.globalData.config,
      }, storedBrokerId);
      this.setLatestAttemptPreview(this.getCachedLatestAttempt());
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
        loginWarning: "未取得登入代碼",
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
      if (response.user) {
        wx.setStorageSync(STORAGE_KEYS.latestUser, response.user);
      }
      this.globalData.shareBrokerId = String(
        this.globalData.sourceBrokerId
        || this.globalData.defaultBroker?.id
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
        loginWarning: error?.message || "取得 OpenID 失敗",
      };
    }
  },

  getShareBrokerId() {
    return this.globalData.shareBrokerId
      || this.globalData.sourceBrokerId
      || this.globalData.sourceBroker?.id
      || this.getStoredBrokerId()
      || this.globalData.defaultBroker?.id
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
      ? `${path}${separator}broker=${encodeURIComponent(brokerId)}`
      : path;

    return {
      title: options.title || this.globalData.appName,
      path: sharePath,
      imageUrl: options.imageUrl,
    };
  },
});
