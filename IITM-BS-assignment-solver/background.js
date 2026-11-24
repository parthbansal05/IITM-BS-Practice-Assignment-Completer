// No popup is set in the manifest, so clicking the icon fires this directly.
const SITE = "https://seek.onlinedegree.iitm.ac.in/";

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url?.startsWith(SITE)) {
    chrome.action.setBadgeText({ tabId: tab.id, text: "!" });
    chrome.action.setTitle({
      tabId: tab.id,
      title: "Open a course on " + SITE + " first",
    });
    return;
  }
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["toast.js", "solver.js"],
  });
});
