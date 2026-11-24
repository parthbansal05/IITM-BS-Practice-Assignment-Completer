// Shows a small message on the page. Also runs on every page load, so a message
// saved just before a refresh is shown after it.
(() => {
  const KEY = "iitm-solver-message";

  globalThis.iitmToast = (text, type = "info") => {
    document.getElementById("iitm-solver-toast")?.remove();
    const colors = { info: "#1d4ed8", success: "#15803d", error: "#b91c1c" };
    const box = document.createElement("div");
    box.id = "iitm-solver-toast";
    box.setAttribute("role", "status");
    box.textContent = text;
    box.title = "Click to close";
    box.style.cssText = `position:fixed;top:20px;right:20px;z-index:2147483647;
      max-width:380px;max-height:80vh;overflow:auto;white-space:pre-line;padding:14px 18px;border-radius:10px;cursor:pointer;
      background:${colors[type]};color:#fff;font:15px/1.4 system-ui,sans-serif;
      box-shadow:0 6px 20px rgba(0,0,0,.3)`;
    box.onclick = () => box.remove();
    document.body.appendChild(box);
  };

  globalThis.iitmToastAfterReload = (text) => {
    sessionStorage.setItem(KEY, text);
    location.reload();
  };

  const saved = sessionStorage.getItem(KEY);
  if (saved) {
    sessionStorage.removeItem(KEY);
    globalThis.iitmToast(saved, "success");
  }
})();
