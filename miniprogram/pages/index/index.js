import { request } from "../../utils/request";

Page({
  clearRefreshTimer() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  },

  startAutoRefresh() {
    this.clearRefreshTimer();
    this.refreshTimer = setInterval(() => {
      this.loadConfig({ silent: true });
    }, 30000);
  },

  data: {
    loading: true,
    papers: [],
    selectedPaperId: "",
    selectedPaper: null,
    latestUnlockedAttempt: null,
  },

  openIdTapCount: 0,

  async onShow() {
    await getApp().waitForBootstrap();
    this.syncLatestResultEntry();
    if (this.maybeOpenActiveQuiz()) {
      this.clearRefreshTimer();
      return;
    }
    if (this.maybeOpenLatestAttempt()) {
      this.clearRefreshTimer();
      return;
    }
    await this.loadConfig();
    this.startAutoRefresh();
  },

  onHide() {
    this.clearRefreshTimer();
  },

  onUnload() {
    this.clearRefreshTimer();
  },

  async loadConfig(options = {}) {
    const { silent = false } = options;
    if (!silent) {
      this.setData({ loading: true });
    }

    try {
      const response = await request({ url: "/config" });
      const papers = response.papers || [];
      const currentSelectedPaperId = String(this.data.selectedPaperId || "").trim();
      const selectedPaperId = papers.some((item) => item.id === currentSelectedPaperId)
        ? currentSelectedPaperId
        : (papers[0]?.id || "");
      const selectedPaper = papers.find((item) => item.id === selectedPaperId) || null;

      this.setData({
        loading: false,
        papers,
        selectedPaperId,
        selectedPaper,
      });
      this.syncLatestResultEntry();
      this.prefetchQuestionBank(selectedPaper);
    } catch (error) {
      console.error(error);
      if (!silent) {
        this.setData({ loading: false });
        wx.showToast({
          title: "請求失敗",
          icon: "none",
        });
      }
    }
  },

  syncLatestResultEntry() {
    const preview = getApp().globalData.latestAttemptPreview;
    const latestUnlockedAttempt = preview?.id && preview?.access?.canViewAnswers
      ? preview
      : null;

    this.setData({
      latestUnlockedAttempt,
    });
  },

  selectPaper(event) {
    const selectedPaperId = event.currentTarget.dataset.id;
    const selectedPaper = this.data.papers.find((item) => item.id === selectedPaperId) || null;
    this.resetOpenIdTapState();
    this.setData({
      selectedPaperId,
      selectedPaper,
    });
    this.prefetchQuestionBank(selectedPaper);
  },

  getSelectedPaper() {
    return this.data.papers.find((item) => item.id === this.data.selectedPaperId) || null;
  },

  tapQuestionCountConfig() {
    this.openIdTapCount += 1;
    if (this.openIdTapCount >= 5) {
      this.resetOpenIdTapState();
      this.showCurrentOpenId();
    }
  },

  resetOpenIdTapState() {
    this.openIdTapCount = 0;
  },

  async showCurrentOpenId() {
    const { openid, loginAvailable, loginWarning } = await getApp().getCurrentOpenId({
      forceRefresh: true,
    });

    if (!openid) {
      wx.showToast({
        title: loginWarning || (loginAvailable ? "未取得 OpenID" : "服務端未開啟微信登入"),
        icon: "none",
      });
      return;
    }

    wx.showModal({
      title: "目前使用者 OpenID",
      content: openid,
      confirmText: "複製",
      cancelText: "關閉",
      success: ({ confirm }) => {
        if (!confirm) {
          return;
        }

        wx.setClipboardData({
          data: openid,
          success: () => {
            wx.showToast({
              title: "OpenID 已複製",
              icon: "none",
            });
          },
          fail: () => {
            wx.showToast({
              title: "複製失敗",
              icon: "none",
            });
          },
        });
      },
    });
  },

  async prefetchQuestionBank(paper) {
    if (!paper?.id) {
      getApp().setPreloadedQuiz(null);
      return;
    }

    const preloadKey = `${paper.id}:${paper.updatedAt}:${paper.quizConfig?.questionCount || 0}`;
    if (this.lastPreloadKey === preloadKey) {
      return;
    }

    this.lastPreloadKey = preloadKey;

    try {
      const response = await request({
        url: `/question-bank?paperId=${encodeURIComponent(paper.id)}`,
      });

      if (this.lastPreloadKey !== preloadKey) {
        return;
      }

      getApp().setPreloadedQuiz({
        paperId: paper.id,
        updatedAt: paper.updatedAt,
        response,
      });
    } catch {
      if (this.lastPreloadKey === preloadKey) {
        getApp().setPreloadedQuiz(null);
      }
    }
  },

  maybeOpenLatestAttempt() {
    if (this.latestAttemptNavigating) {
      return true;
    }

    const latestAttempt = getApp().consumeLatestAttemptForAutoOpen();
    if (!latestAttempt?.id) {
      return false;
    }

    this.latestAttemptNavigating = true;
    wx.navigateTo({
      url: `/pages/result/index?attemptId=${encodeURIComponent(latestAttempt.id)}`,
      complete: () => {
        this.latestAttemptNavigating = false;
      },
    });
    return true;
  },

  maybeOpenActiveQuiz() {
    if (this.activeQuizNavigating) {
      return true;
    }

    const activeQuizSession = getApp().consumeActiveQuizSessionForAutoOpen();
    if (!activeQuizSession?.paper?.id) {
      return false;
    }

    this.activeQuizNavigating = true;
    wx.navigateTo({
      url: `/pages/quiz/index?paperId=${encodeURIComponent(activeQuizSession.paper.id)}&resume=1`,
      complete: () => {
        this.activeQuizNavigating = false;
      },
    });
    return true;
  },

  startQuiz() {
    const paper = this.getSelectedPaper();
    if (!paper) {
      wx.showToast({
        title: "暫無題庫",
        icon: "none",
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/quiz/index?paperId=${paper.id}`,
    });
  },

  openLatestAttempt() {
    const attemptId = String(this.data.latestUnlockedAttempt?.id || "").trim();
    if (!attemptId) {
      wx.showToast({
        title: "暫無可查看的作答結果",
        icon: "none",
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/result/index?attemptId=${encodeURIComponent(attemptId)}`,
    });
  },

  onShareAppMessage() {
    return getApp().createShareOptions({
      title: "我正在刷保險題，一起來練習",
      path: "/pages/index/index",
    });
  },
});
