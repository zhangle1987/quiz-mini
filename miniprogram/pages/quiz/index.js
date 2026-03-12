import { request } from "../../utils/request";

Page({
  clearAutoNextTimer() {
    if (this.autoNextTimer) {
      clearTimeout(this.autoNextTimer);
      this.autoNextTimer = null;
    }
  },

  data: {
    loading: true,
    submitting: false,
    paper: null,
    questions: [],
    currentIndex: 0,
    answers: {},
    answeredCount: 0,
    progressPercent: 0,
    currentQuestionAnswered: false,
  },

  onLoad(options) {
    this.loadQuestions(options.paperId, options.count);
  },

  onUnload() {
    this.clearAutoNextTimer();
  },

  decorateQuestions(questions) {
    return questions.map((question) => ({
      ...question,
      radioOptions: question.options.map((option) => ({
        value: option.key,
        text: option.text,
      })),
    }));
  },

  updateProgress(nextIndex = this.data.currentIndex, nextAnswers = this.data.answers) {
    const total = this.data.questions.length;
    const answeredCount = Object.keys(nextAnswers).length;
    const progressPercent = total ? Math.round(((nextIndex + 1) / total) * 100) : 0;
    const currentQuestion = this.data.questions[nextIndex];
    const currentQuestionAnswered = Boolean(currentQuestion && nextAnswers[currentQuestion.id]);

    this.setData({
      answeredCount,
      progressPercent,
      currentQuestionAnswered,
    });
  },

  async loadQuestions(paperId, count) {
    this.setData({ loading: true });
    try {
      const response = await request({
        url: `/question-bank?paperId=${encodeURIComponent(paperId)}&count=${count}`,
      });
      const questions = this.decorateQuestions(response.questions);

      wx.setNavigationBarTitle({
        title: response.paper.title,
      });

      this.setData({
        loading: false,
        paper: response.paper,
        questions,
        currentIndex: 0,
        answers: {},
        answeredCount: 0,
        progressPercent: questions.length ? Math.round((1 / questions.length) * 100) : 0,
        currentQuestionAnswered: false,
      });
    } catch (error) {
      console.error(error);
      wx.showToast({
        title: "题目加载失败",
        icon: "none",
      });
      this.setData({ loading: false });
    }
  },

  onOptionTap(event) {
    this.selectAnswer(event.currentTarget.dataset.value);
  },

  selectAnswer(answer) {
    const currentQuestion = this.data.questions[this.data.currentIndex];
    const answers = {
      ...this.data.answers,
      [currentQuestion.id]: answer,
    };

    this.setData({ answers });
    this.updateProgress(this.data.currentIndex, answers);

    if (this.data.currentIndex < this.data.questions.length - 1) {
      const nextIndex = this.data.currentIndex + 1;
      this.clearAutoNextTimer();
      this.autoNextTimer = setTimeout(() => {
        this.setData({ currentIndex: nextIndex });
        this.updateProgress(nextIndex, answers);
        this.autoNextTimer = null;
      }, 160);
    }
  },

  prevQuestion() {
    this.clearAutoNextTimer();
    if (this.data.currentIndex === 0) {
      return;
    }
    const nextIndex = this.data.currentIndex - 1;
    this.setData({ currentIndex: nextIndex });
    this.updateProgress(nextIndex, this.data.answers);
  },

  nextQuestion() {
    this.clearAutoNextTimer();
    if (this.data.currentIndex >= this.data.questions.length - 1) {
      return;
    }
    if (!this.data.currentQuestionAnswered) {
      wx.showToast({
        title: "请先回答当前题目",
        icon: "none",
      });
      return;
    }
    const nextIndex = this.data.currentIndex + 1;
    this.setData({ currentIndex: nextIndex });
    this.updateProgress(nextIndex, this.data.answers);
  },

  async submitQuiz() {
    const answers = Object.entries(this.data.answers).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));

    if (answers.length !== this.data.questions.length) {
      wx.showToast({
        title: "请先完成全部题目",
        icon: "none",
      });
      return;
    }

    this.setData({ submitting: true });
    try {
      const result = await request({
        url: "/quiz/grade",
        method: "POST",
        data: {
          paperId: this.data.paper.id,
          brokerId: getApp().getShareBrokerId(),
          answers,
        },
      });
      wx.setStorageSync("latestQuizResult", result);
      wx.navigateTo({
        url: "/pages/result/index",
      });
    } catch (error) {
      console.error(error);
      wx.showToast({
        title: "提交失败",
        icon: "none",
      });
    } finally {
      this.setData({ submitting: false });
    }
  },

  onShareAppMessage() {
    return getApp().createShareOptions({
      title: `${this.data.paper?.title || "保险刷题"}，一起来练习`,
      path: "/pages/index/index",
    });
  },
});
