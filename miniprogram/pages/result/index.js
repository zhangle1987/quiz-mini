import { request } from "../../utils/request";

Page({
  data: {
    loading: true,
    attempt: null,
    broker: null,
    viewer: null,
    canViewAnswers: false,
  },

  onLoad(options) {
    this.attemptId = String(options?.attemptId || "").trim();
  },

  async onShow() {
    await this.loadAttempt();
  },

  normalizeBroker(broker) {
    if (!broker) {
      return null;
    }

    const qrImageUrl = String(broker.qrImageUrl || "").trim().replace(/^http:\/\//i, "https://");
    return {
      ...broker,
      qrImageUrl,
    };
  },

  normalizeAttempt(attempt) {
    if (!attempt) {
      return null;
    }

    const canViewAnswers = Boolean(attempt.access?.canViewAnswers);
    const normalizedResults = canViewAnswers && Array.isArray(attempt.results)
      ? attempt.results.map((item) => {
        const isAnswered = item.isAnswered !== false && Boolean(item.userAnswer);
        const statusLabel = !isAnswered ? "未作答" : (item.isCorrect ? "正確" : "錯誤");
        const statusClass = !isAnswered
          ? "result-state--unanswered"
          : (item.isCorrect ? "result-state--correct" : "result-state--wrong");
        return {
          ...item,
          isAnswered,
          statusLabel,
          statusClass,
          userAnswerLabel: item.userAnswer || "未作答",
        };
      })
      : [];

    const summary = canViewAnswers
      ? {
        total: Number(attempt.summary?.total || normalizedResults.length || 0),
        answeredCount: Number(
          attempt.summary?.answeredCount ?? normalizedResults.filter((item) => item.isAnswered).length,
        ),
        unansweredCount: Number(
          attempt.summary?.unansweredCount ?? normalizedResults.filter((item) => !item.isAnswered).length,
        ),
        correctCount: Number(
          attempt.summary?.correctCount ?? normalizedResults.filter((item) => item.isCorrect).length,
        ),
        wrongCount: Number(
          attempt.summary?.wrongCount
            ?? normalizedResults.filter((item) => !item.isCorrect).length,
        ),
        accuracy: Number(attempt.summary?.accuracy ?? attempt.summary?.score ?? 0),
        passThreshold: Number(attempt.summary?.passThreshold ?? 70),
        passed: typeof attempt.summary?.passed === "boolean"
          ? attempt.summary.passed
          : Number(attempt.summary?.accuracy ?? attempt.summary?.score ?? 0)
            >= Number(attempt.summary?.passThreshold ?? 70),
        autoSubmitted: Boolean(attempt.summary?.autoSubmitted),
      }
      : null;

    return {
      ...attempt,
      access: {
        friendStatus: attempt.access?.friendStatus || "pending",
        canViewAnswers,
        requiresFriend: !canViewAnswers,
      },
      summary,
      results: normalizedResults,
      paper: {
        ...(attempt.paper || {}),
        quizConfig: {
          questionCount: Number(
            attempt.paper?.quizConfig?.questionCount ?? summary?.total ?? 0,
          ),
          durationMinutes: Number(attempt.paper?.quizConfig?.durationMinutes ?? 0),
          passThreshold: Number(attempt.paper?.quizConfig?.passThreshold ?? summary?.passThreshold ?? 70),
        },
      },
    };
  },

  applyAttempt(attempt, viewer = null) {
    const normalizedAttempt = this.normalizeAttempt(attempt);
    getApp().markLatestAttemptViewed(normalizedAttempt);
    const broker = this.normalizeBroker(normalizedAttempt?.broker || null);
    this.setData({
      loading: false,
      attempt: normalizedAttempt,
      broker,
      viewer: viewer || this.data.viewer,
      canViewAnswers: Boolean(normalizedAttempt?.access?.canViewAnswers),
    });
  },

  async loadAttempt() {
    this.setData({ loading: true });

    const cachedAttempt = getApp().getCachedLatestAttempt();
    if (!this.attemptId && cachedAttempt?.id) {
      this.attemptId = String(cachedAttempt.id || "").trim();
    }

    if (cachedAttempt?.id && cachedAttempt.id === this.attemptId) {
      this.applyAttempt(cachedAttempt, getApp().globalData.user || null);
    }

    if (!this.attemptId) {
      wx.showToast({
        title: "暫無作答記錄",
        icon: "none",
      });
      this.setData({ loading: false });
      return;
    }

    try {
      const { openid, loginAvailable, loginWarning } = await getApp().getCurrentOpenId();
      if (!openid) {
        throw new Error(loginWarning || (loginAvailable ? "未取得 OpenID" : "服務端未開啟微信登入"));
      }

      const payload = await request({
        url: "/quiz/attempt-detail",
        method: "POST",
        data: {
          attemptId: this.attemptId,
          openid,
        },
      });

      getApp().globalData.user = payload.user || getApp().globalData.user || null;
      getApp().cacheLatestAttempt(payload.attempt || null);
      wx.setStorageSync("latestQuizResult", payload.attempt || null);
      this.applyAttempt(payload.attempt || null, payload.user || null);
    } catch (error) {
      console.error(error);
      if (!cachedAttempt) {
        wx.showToast({
          title: error?.message || "載入結果失敗",
          icon: "none",
        });
        this.setData({ loading: false });
      }
    }
  },

  backHome() {
    getApp().dismissLatestAttempt(this.data.attempt?.id || "");
    getApp().clearActiveQuizSession();
    wx.reLaunch({
      url: "/pages/index/index",
    });
  },

  restartQuiz() {
    const paperId = String(this.data.attempt?.paper?.id || "").trim();
    if (!paperId) {
      wx.showToast({
        title: "未找到題庫資訊",
        icon: "none",
      });
      return;
    }

    getApp().dismissLatestAttempt(this.data.attempt?.id || "");
    wx.redirectTo({
      url: `/pages/quiz/index?paperId=${encodeURIComponent(paperId)}`,
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
      title: `${this.data.attempt?.paper?.title || "保險刷題"}，一起來練習`,
      path: "/pages/index/index",
    });
  },
});
