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
    submitPromptVisible: false,
    submitPromptLocked: false,
    submitPromptMessage: "",
    submitNickname: "",
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
    const activeSession = this.getActiveSession(options.paperId);
    if (activeSession) {
      this.restoreQuizSession(activeSession);
      return;
    }

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
    if (!this.data.submitPromptLocked) {
      this.setData({ submitPromptVisible: false });
    }
    this.persistQuizSession();
  },

  onUnload() {
    this.clearAutoNextTimer();
    this.clearCountdownTimer();
    if (this.shouldPersistSession === false) {
      return;
    }

    const activeSession = getApp().getActiveQuizSession();
    if (activeSession?.id && activeSession.id === this.sessionId) {
      getApp().clearActiveQuizSession();
    }
  },

  getActiveSession(expectedPaperId = "") {
    const session = getApp().getActiveQuizSession();
    if (!session?.paper?.id) {
      return null;
    }

    const normalizedExpectedPaperId = String(expectedPaperId || "").trim();
    if (normalizedExpectedPaperId && String(session.paper.id || "").trim() !== normalizedExpectedPaperId) {
      return null;
    }

    return session;
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
    this.persistQuizSession({
      currentIndex: nextIndex,
      answers: nextAnswers,
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
    this.persistQuizSession();
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
          this.prepareSubmit({ forced: true });
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
    this.shouldPersistSession = true;
    this.sessionId = `quiz-${response.paper.id}-${Date.now()}`;
    getApp().setActiveQuizSession({
      id: this.sessionId,
      paper: response.paper,
      quizConfig,
      questions,
      answers: {},
      currentIndex: 0,
      deadlineAt: 0,
    }, { markHandled: true });
    this.startCountdown(quizConfig.durationMinutes || 60);
  },

  restoreQuizSession(session) {
    const questions = Array.isArray(session.questions) ? session.questions : [];
    const quizConfig = session.quizConfig || {
      durationMinutes: 60,
      questionCount: questions.length,
      passThreshold: 70,
    };
    const answers = session.answers && typeof session.answers === "object" ? session.answers : {};
    const currentIndex = Math.max(
      0,
      Math.min(Number(session.currentIndex) || 0, Math.max(questions.length - 1, 0)),
    );
    this.sessionId = String(session.id || `quiz-${session.paper?.id || "paper"}-${Date.now()}`);
    this.deadlineAt = Number(session.deadlineAt) || Date.now();
    this.shouldPersistSession = true;

    wx.setNavigationBarTitle({
      title: session.paper?.title || "作答中",
    });

    this.setData({
      loading: false,
      paper: session.paper || null,
      quizConfig,
      questions,
      currentIndex,
      answers,
      answeredCount: 0,
      progressPercent: 0,
      currentQuestionAnswered: false,
      remainingSeconds: Math.max(0, Math.ceil((this.deadlineAt - Date.now()) / 1000)),
      timerText: this.formatRemainingTime(Math.max(0, Math.ceil((this.deadlineAt - Date.now()) / 1000))),
    });
    getApp().setActiveQuizSession({
      id: this.sessionId,
      paper: session.paper || null,
      quizConfig,
      questions,
      answers,
      currentIndex,
      deadlineAt: this.deadlineAt,
    }, { markHandled: true });
    this.updateProgress(currentIndex, answers);
    this.startCountdownTick();
  },

  persistQuizSession(overrides = {}) {
    if (this.shouldPersistSession === false) {
      return;
    }

    const paper = overrides.paper || this.data.paper;
    const questions = overrides.questions || this.data.questions;
    if (!paper?.id || !Array.isArray(questions) || !questions.length) {
      return;
    }

    getApp().setActiveQuizSession({
      id: this.sessionId || `quiz-${paper.id}-${Date.now()}`,
      paper,
      quizConfig: overrides.quizConfig || this.data.quizConfig,
      questions,
      answers: overrides.answers || this.data.answers,
      currentIndex: Number.isFinite(Number(overrides.currentIndex))
        ? Number(overrides.currentIndex)
        : this.data.currentIndex,
      deadlineAt: Number(overrides.deadlineAt ?? this.deadlineAt) || 0,
    }, { markHandled: true });
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
        title: "題目載入失敗",
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
    } else {
      this.persistQuizSession({ answers });
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
        title: "請先回答目前題目",
        icon: "none",
      });
      return;
    }
    const nextIndex = this.data.currentIndex + 1;
    this.setData({ currentIndex: nextIndex });
    this.updateProgress(nextIndex, this.data.answers);
  },

  async prepareSubmit(options = {}) {
    if (this.data.submitting) {
      return;
    }

    const forced = Boolean(options.forced);

    try {
      const { openid, loginAvailable, loginWarning } = await getApp().getCurrentOpenId({
        forceRefresh: true,
      });
      if (!openid) {
        throw new Error(loginWarning || (loginAvailable ? "未取得 OpenID" : "服務端未開啟微信登入"));
      }

      const friendStatus = String(getApp().globalData.user?.friendStatus || "").trim().toLowerCase();
      if (friendStatus === "added") {
        await this.submitQuiz({ openid, nickname: "", forced });
        return;
      }
    } catch (error) {
      wx.showToast({
        title: error?.message || "提交前檢查失敗",
        icon: "none",
      });
      return;
    }

    this.openSubmitPrompt({ forced });
  },

  openSubmitPrompt(options = {}) {
    if (this.data.submitting) {
      return;
    }

    const forced = Boolean(options.forced);
    const unansweredCount = this.data.questions.length - Object.keys(this.data.answers).length;
    const submitPromptMessage = forced
      ? "作答時間已結束，請先填寫暱稱，再提交答卷。"
      : unansweredCount > 0
      ? `還有 ${unansweredCount} 題未作答。請先填寫暱稱，再提交答卷。`
      : "請先填寫暱稱，再提交答卷。";

    this.setData({
      submitPromptVisible: true,
      submitPromptLocked: forced,
      submitPromptMessage,
      submitNickname: String(getApp().globalData.user?.nickname || "").trim(),
    });
  },

  cancelSubmitPrompt() {
    if (this.data.submitting || this.data.submitPromptLocked) {
      return;
    }

    this.setData({
      submitPromptVisible: false,
      submitPromptLocked: false,
      submitPromptMessage: "",
      submitNickname: "",
    });
  },

  onNicknameInput(event) {
    this.setData({
      submitNickname: String(event.detail?.value || ""),
    });
  },

  async submitWithNickname(event) {
    if (this.data.submitting) {
      return;
    }

    const nickname = String(event?.detail?.value?.nickname || this.data.submitNickname || "").trim();
    if (!nickname) {
      wx.showToast({
        title: "請先填寫暱稱",
        icon: "none",
      });
      return;
    }

    const forced = Boolean(this.data.submitPromptLocked);
    this.setData({
      submitPromptVisible: false,
      submitPromptLocked: false,
      submitPromptMessage: "",
      submitNickname: "",
    });
    await this.submitQuiz({ nickname, forced });
  },

  async submitQuiz(options = {}) {
    const {
      forced = false,
      openid: providedOpenId = "",
    } = options;
    if (this.data.submitting) {
      return;
    }

    const questionIds = this.data.questions.map((item) => item.id);
    const answers = Object.entries(this.data.answers).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));

    this.clearCountdownTimer();
    this.setData({
      submitting: true,
      submitPromptVisible: false,
      submitPromptLocked: false,
      submitPromptMessage: "",
      submitNickname: "",
    });
    try {
      let openid = String(providedOpenId || "").trim();
      let loginAvailable = getApp().globalData.loginAvailable;
      let loginWarning = getApp().globalData.loginWarning;
      if (!openid) {
        const loginState = await getApp().getCurrentOpenId();
        openid = String(loginState.openid || "").trim();
        loginAvailable = loginState.loginAvailable;
        loginWarning = loginState.loginWarning;
      }
      if (!openid) {
        throw new Error(loginWarning || (loginAvailable ? "未取得 OpenID" : "服務端未開啟微信登入"));
      }

      const result = await request({
        url: "/quiz/grade",
        method: "POST",
        data: {
          paperId: this.data.paper.id,
          questionIds,
          brokerId: getApp().getShareBrokerId(),
          openid,
          nickname: String(options.nickname || "").trim(),
          answers,
          submitMode: forced ? "timeout" : "manual",
        },
      });
      this.shouldPersistSession = false;
      getApp().clearActiveQuizSession();
      getApp().cacheLatestAttempt(result.attempt || null);
      getApp().markLatestAttemptViewed(result.attempt || null);
      wx.setStorageSync("latestQuizResult", result.attempt || null);
      wx.redirectTo({
        url: `/pages/result/index?attemptId=${encodeURIComponent(result.attempt?.id || "")}`,
      });
    } catch (error) {
      console.error(error);
      wx.showToast({
        title: "提交失敗",
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
      title: `${this.data.paper?.title || "保險刷題"}，一起來練習`,
      path: "/pages/index/index",
    });
  },
});
