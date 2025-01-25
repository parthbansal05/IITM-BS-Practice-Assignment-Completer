document.getElementById('startButton').addEventListener('click', function() {
    chrome.tabs.executeScript({
      file: 'content.js'
    });
  });
  