import { request } from "../../utils/request";

Page({
  data: {
    loading: true,
    papers: [],
    selectedPaperId: "",
    countOptions: [],
    selectedCount: 0,
  },

  async onShow() {
    await getApp().waitForBootstrap();
    this.loadConfig();
  },

  async loadConfig() {
    this.setData({ loading: true });

    try {
      const response = await request({ url: "/config" });
      const papers = response.papers || [];
      const questionCountOptions = response.config?.questionCountOptions || [10];
      const selectedPaperId = papers[0]?.id || "";
      const selectedCount = response.config?.defaultQuestionCount || questionCountOptions[0] || 10;

      this.setData({
        loading: false,
        papers,
        selectedPaperId,
        countOptions: questionCountOptions.map((item) => ({
          value: item,
          label: `${item} 题`,
        })),
        selectedCount,
      });
    } catch (error) {
      console.error(error);
      this.setData({ loading: false });
      wx.showToast({
        title: "请求失败",
        icon: "none",
      });
    }
  },

  selectPaper(event) {
    const selectedPaperId = event.currentTarget.dataset.id;
    this.setData({ selectedPaperId });
  },

  selectCount(event) {
    this.setData({
      selectedCount: Number(event.currentTarget.dataset.value),
    });
  },

  startQuiz() {
    const paper = this.data.papers.find((item) => item.id === this.data.selectedPaperId);
    if (!paper) {
      wx.showToast({
        title: "暂无题库",
        icon: "none",
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/quiz/index?paperId=${paper.id}&count=${this.data.selectedCount}`,
    });
  },

  onShareAppMessage() {
    return getApp().createShareOptions({
      title: "我在刷保险题，来一起练习",
      path: "/pages/index/index",
    });
  },
});
