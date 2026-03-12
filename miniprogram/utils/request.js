function getApiBaseUrl() {
  return getApp().globalData.apiBaseUrl;
}

export function getServerOrigin() {
  return getApp().globalData.serverOrigin;
}

export function request({ url, method = "GET", data, header = {} }) {
  return new Promise((resolve, reject) => {
    const upperMethod = String(method || "GET").toUpperCase();
    const requestUrl = upperMethod === "GET"
      ? `${getApiBaseUrl()}${url}${url.includes("?") ? "&" : "?"}_t=${Date.now()}`
      : `${getApiBaseUrl()}${url}`;
    wx.request({
      url: requestUrl,
      method: upperMethod,
      data,
      header,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }
        reject(new Error(res.data?.message || `请求失败: ${res.statusCode}`));
      },
      fail(error) {
        reject(error);
      },
    });
  });
}
