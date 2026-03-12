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
  },

  openIdTapCount: 0,

  async onShow() {
    await getApp().waitForBootstrap();
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
      this.prefetchQuestionBank(selectedPaper);
    } catch (error) {
      console.error(error);
      if (!silent) {
        this.setData({ loading: false });
        wx.showToast({
          title: "请求失败",
          icon: "none",
        });
      }
    }
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
        title: loginWarning || (loginAvailable ? "未获取到 OpenID" : "服务端未开启微信登录"),
        icon: "none",
      });
      return;
    }

    wx.showModal({
      title: "当前用户 OpenID",
      content: openid,
      confirmText: "复制",
      cancelText: "关闭",
      success: ({ confirm }) => {
        if (!confirm) {
          return;
        }

        wx.setClipboardData({
          data: openid,
          success: () => {
            wx.showToast({
              title: "OpenID 已复制",
              icon: "none",
            });
          },
          fail: () => {
            wx.showToast({
              title: "复制失败",
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

  startQuiz() {
    const paper = this.getSelectedPaper();
    if (!paper) {
      wx.showToast({
        title: "暂无题库",
        icon: "none",
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/quiz/index?paperId=${paper.id}`,
    });
  },

  onShareAppMessage() {
    return getApp().createShareOptions({
      title: "我在刷保险题，来一起练习",
      path: "/pages/index/index",
    });
  },
});
