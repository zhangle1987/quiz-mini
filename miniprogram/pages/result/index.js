Page({
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

  normalizeResult(result) {
    if (!result) {
      return null;
    }

    const normalizedResults = Array.isArray(result.results)
      ? result.results.map((item) => {
        const isAnswered = item.isAnswered !== false && Boolean(item.userAnswer);
        const statusLabel = !isAnswered ? "未作答" : (item.isCorrect ? "正确" : "错误");
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

    const summary = {
      total: Number(result.summary?.total || normalizedResults.length || 0),
      answeredCount: Number(
        result.summary?.answeredCount ?? normalizedResults.filter((item) => item.isAnswered).length,
      ),
      unansweredCount: Number(
        result.summary?.unansweredCount ?? normalizedResults.filter((item) => !item.isAnswered).length,
      ),
      correctCount: Number(
        result.summary?.correctCount ?? normalizedResults.filter((item) => item.isCorrect).length,
      ),
      wrongCount: Number(
        result.summary?.wrongCount
          ?? normalizedResults.filter((item) => !item.isCorrect).length,
      ),
      accuracy: Number(result.summary?.accuracy ?? result.summary?.score ?? 0),
      passThreshold: Number(result.summary?.passThreshold ?? 70),
      passed: typeof result.summary?.passed === "boolean"
        ? result.summary.passed
        : Number(result.summary?.accuracy ?? result.summary?.score ?? 0)
          >= Number(result.summary?.passThreshold ?? 70),
      autoSubmitted: Boolean(result.summary?.autoSubmitted),
    };
    const paper = {
      ...(result.paper || {}),
      quizConfig: {
        questionCount: Number(result.paper?.quizConfig?.questionCount ?? summary.total),
        durationMinutes: Number(result.paper?.quizConfig?.durationMinutes ?? 0),
        passThreshold: summary.passThreshold,
      },
    };

    return {
      ...result,
      paper,
      summary,
      results: normalizedResults,
    };
  },

  data: {
    result: null,
    broker: null,
  },

  onShow() {
    const result = wx.getStorageSync("latestQuizResult");
    if (!result) {
      wx.showToast({
        title: "暂无答题结果",
        icon: "none",
      });
      return;
    }

    const normalizedResult = this.normalizeResult(result);
    const broker = this.normalizeBroker(result.broker || null);
    this.setData({
      result: normalizedResult,
      broker,
    });
  },

  backHome() {
    wx.navigateBack({
      delta: 2,
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
      title: `${this.data.result?.paper?.title || "保险刷题"}，一起来练习`,
      path: "/pages/index/index",
    });
  },
});
