function getApiBaseUrl() {
  return getApp().globalData.apiBaseUrl;
}

export function getServerOrigin() {
  return getApp().globalData.serverOrigin;
}

export function request({ url, method = "GET", data, header = {} }) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${getApiBaseUrl()}${url}`,
      method,
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
