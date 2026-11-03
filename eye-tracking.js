/* WebGazer browser dependency: loaded only after the participant opts in.
 * Pinned upstream version: 3.5.3 (GPL-3.0-or-later).
 * https://github.com/brownhci/WebGazer
 * Loading this file does not request webcam access or record user data.
 */
(() => {
  "use strict";
  const scriptUrl = "https://cdn.jsdelivr.net/npm/webgazer@3.5.3/dist/webgazer.js";
  let pending = null;
  window.AttentionEye = Object.freeze({
    version: "3.5.3",
    source: scriptUrl,
    load() {
      if (window.webgazer && typeof window.webgazer.begin === "function") return Promise.resolve(window.webgazer);
      if (pending) return pending;
      pending = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = scriptUrl;
        script.async = true;
        script.crossOrigin = "anonymous";
        script.onload = () => {
          if (window.webgazer && typeof window.webgazer.begin === "function") resolve(window.webgazer);
          else reject(new Error("WebGazer 脚本已下载，但初始化 API 不可用。"));
        };
        script.onerror = () => {
          script.remove();
          reject(new Error("WebGazer 3.5.3 加载失败；请检查网络或浏览器脚本拦截设置。"));
        };
        document.head.appendChild(script);
      }).catch(error => {
        pending = null;
        throw error;
      });
      return pending;
    }
  });
})();
