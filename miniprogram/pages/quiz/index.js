import { request } from "../../utils/request";

Page({
  clearAutoNextTimer() {
    if (this.autoNextTimer) {
      clearTimeout(this.autoNextTimer);
      this.autoNextTimer = null;
    }
  },

  clearCountdownTimer() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  },

  data: {
    loading: true,
    submitting: false,
    paper: null,
    quizConfig: null,
    questions: [],
    currentIndex: 0,
    answers: {},
    answeredCount: 0,
    progressPercent: 0,
    currentQuestionAnswered: false,
    remainingSeconds: 0,
    timerText: "00:00",
  },

  onLoad(options) {
    const preloaded = getApp().takePreloadedQuiz(options.paperId);
    if (preloaded) {
      this.applyQuestionBankResponse(preloaded);
      return;
    }

    this.loadQuestions(options.paperId);
  },

  onShow() {
    if (!this.deadlineAt || !this.data.questions.length || this.data.submitting) {
      return;
    }

    this.startCountdownTick();
  },

  onHide() {
    this.clearCountdownTimer();
  },

  onUnload() {
    this.clearAutoNextTimer();
    this.clearCountdownTimer();
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

  formatRemainingTime(totalSeconds = 0) {
    const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  },

  startCountdown(durationMinutes) {
    const totalSeconds = Math.max(0, Math.round((Number(durationMinutes) || 0) * 60));
    this.deadlineAt = Date.now() + totalSeconds * 1000;
    this.setData({
      remainingSeconds: totalSeconds,
      timerText: this.formatRemainingTime(totalSeconds),
    });
    this.startCountdownTick();
  },

  startCountdownTick() {
    this.clearCountdownTimer();
    if (!this.deadlineAt) {
      return;
    }

    const tick = () => {
      const remainingSeconds = Math.max(0, Math.ceil((this.deadlineAt - Date.now()) / 1000));
      this.setData({
        remainingSeconds,
        timerText: this.formatRemainingTime(remainingSeconds),
      });

      if (remainingSeconds <= 0) {
        this.clearCountdownTimer();
        if (!this.data.submitting) {
          this.submitQuiz({ forced: true });
        }
      }
    };

    tick();
    const remainingAfterTick = Math.max(0, Math.ceil((this.deadlineAt - Date.now()) / 1000));
    if (remainingAfterTick > 0) {
      this.countdownTimer = setInterval(tick, 1000);
    }
  },

  applyQuestionBankResponse(response) {
    const questions = this.decorateQuestions(response.questions || []);
    const quizConfig = response.paper?.quizConfig || {
      durationMinutes: 60,
      questionCount: questions.length,
      passThreshold: 70,
    };

    wx.setNavigationBarTitle({
      title: response.paper.title,
    });

    this.setData({
      loading: false,
      paper: response.paper,
      quizConfig,
      questions,
      currentIndex: 0,
      answers: {},
      answeredCount: 0,
      progressPercent: questions.length ? Math.round((1 / questions.length) * 100) : 0,
      currentQuestionAnswered: false,
      remainingSeconds: Math.round((quizConfig.durationMinutes || 0) * 60),
      timerText: this.formatRemainingTime(Math.round((quizConfig.durationMinutes || 0) * 60)),
    });
    this.startCountdown(quizConfig.durationMinutes || 60);
  },

  async loadQuestions(paperId) {
    this.setData({ loading: true });
    try {
      const response = await request({
        url: `/question-bank?paperId=${encodeURIComponent(paperId)}`,
      });
      this.applyQuestionBankResponse(response);
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

  async submitQuiz(options = {}) {
    const { forced = false, confirmed = false } = options;
    if (this.data.submitting) {
      return;
    }

    const questionIds = this.data.questions.map((item) => item.id);
    const answers = Object.entries(this.data.answers).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));
    const unansweredCount = questionIds.length - answers.length;

    if (!forced && unansweredCount > 0 && !confirmed) {
      wx.showModal({
        title: "确认提交",
        content: `还有 ${unansweredCount} 题未作答，确定现在提交吗？`,
        success: ({ confirm }) => {
          if (confirm) {
            this.submitQuiz({ confirmed: true });
          }
        },
      });
      return;
    }

    this.clearCountdownTimer();
    this.setData({ submitting: true });
    try {
      const result = await request({
        url: "/quiz/grade",
        method: "POST",
        data: {
          paperId: this.data.paper.id,
          questionIds,
          brokerId: getApp().getShareBrokerId(),
          answers,
          submitMode: forced ? "timeout" : "manual",
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
      if (this.deadlineAt && Date.now() < this.deadlineAt) {
        this.startCountdownTick();
      }
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
