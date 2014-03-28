var storage, get, popup, window, Deferred, content_script, tab, contextMenu, version;

/*
Storage Items:
    "history"
    "from"
    "to"
    "isTextSelection"
    "isDblclick"
    "enableHistory"
    "numberHistoryItems"
*/

/********/
if (typeof require !== 'undefined') {
  var firefox = require("./firefox.js");
  storage = firefox.storage;
  get = firefox.get;
  popup = firefox.popup;
  window = firefox.window;
  content_script = firefox.content_script;
  tab = firefox.tab;
  contextMenu = firefox.contextMenu;
  version = firefox.version;
  Deferred = firefox.Promise.defer;
}
else {
  storage = _chrome.storage;
  get = _chrome.get;
  popup = _chrome.popup;
  content_script = _chrome.content_script;
  tab = _chrome.tab;
  contextMenu = _chrome.contextMenu;
  version = _chrome.version;
  Deferred = task.Deferred;
}
/********/

var states = {}, loops = {}, tabURL = {};

// ******** 1st inject "initial_inject.js" then run "init()" ********
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, updatedTab) {
  if (tabURL[tabId] != updatedTab.url) {
    states[(/[?&]v=([^&]+)/.exec(tabURL[tabId]) || [null,null])[1]] = -1;
    tabURL[tabId] = updatedTab.url;
    chrome.tabs.executeScript(tabId, {
        code: 'var tabId = ' + tabId + ';'
    }, function() {
        chrome.tabs.executeScript(tabId, {
          file: "data/content_script/initial_inject.js",
          runAt: "document_idle"
        }, null);
    });
  }
});
// *************

function readHistory() {
  var lStorage = storage.read("history");
  lStorage_obj = JSON.parse(lStorage); // lStorage to Hash Array
  return lStorage_obj;
}

function saveToHistory(obj) {
  if (!obj.id || !obj.title) return;
  var numberHistoryItems = parseInt(storage.read('numberHistoryItems'));
  var lStorage_obj = readHistory();
  var isHere = false;
  for (var i = 0; i < lStorage_obj.length; i++) {
    if (obj.id == lStorage_obj[i][0]) {
      isHere = true;
      break;
    }
  }
  if (!isHere) {
    lStorage_obj.push([obj.id, obj.title, obj.duration]);
    if (lStorage_obj.length > numberHistoryItems) { // Only store up to the numberHistoryItems items
        lStorage_obj.shift();
    }
    storage.write("history", JSON.stringify(lStorage_obj));
  }
}

function deleteHistory(videoId) {
  var lStorage_obj = readHistory();
  lStorage_obj = lStorage_obj.filter(function (a) { // Remove duplicate
      return !(a[0] == videoId);
  });
  storage.write("history", JSON.stringify(lStorage_obj));
}

function clearHistory() {
  storage.write("history", "[]");
}

function updatePopup() {
  popup.send("history-update", {
    history: readHistory(),
    historyIndex: parseInt(storage.read("popupHistoryIndex")),
    volumeIndex: parseInt(storage.read("popupVolumeIndex")),
    states: states,
    loops: loops,
    loopIndex: parseInt(storage.read("loop-all"))
  });
}

content_script.receive("player-state-changed", function (obj) {
  if (obj.tabId) {tabURL[obj.tabId] = null;}
  states[obj.id] = obj.state;
  if (obj.state == 0) { // Video ended
    var loopsIndex = loops[obj.id];
    var loopIndex = parseInt(storage.read('loop-all'));
    if (loopsIndex) {
      if (loops[obj.id] < 6) {loops[obj.id] = loopsIndex - 1;}
      content_script.send('player-play', obj.id);
    }
    else if (loopIndex) {
      var i;
      var history = readHistory();
      for (i = 0; i < history.length; i++) {
        var newID = (i == 0) ? history[history.length - 1][0] : history[i-1][0];
        if (obj.id == history[i][0]) {
          if (!(i == 0 && loopIndex == 1)) {
            content_script.send('player-new-id', {
              id: obj.id,
              newID: newID
            });
          }
          break;
        }
      }
      if (loopIndex != 6 && i == 0) {
        storage.write('loop-all', loopIndex - 1);
      }
    }
  }
  updatePopup();
});
content_script.receive('player-details', function (data) {
  saveToHistory(data);
});
content_script.receive("request-inits", function () {
  content_script.send("request-inits", {
    volume: parseInt(storage.read("popupVolumeIndex"))
  });
});
popup.receive('player-play', function (videoId) {
  if (states[videoId] && states[videoId] != -1) {
    content_script.send('player-play', videoId);
  } else {
    tab.open('https://www.youtube.com/watch?v=' + videoId);
  }
});
popup.receive('player-pause', function (videoId) {
  content_script.send('player-pause', videoId);
});
popup.receive('player-stop', function () {
  content_script.send('player-stop');
});
popup.receive('open-youtube', function () {
  tab.open('https://www.youtube.com');
});
popup.receive('player-new-id', function (obj) {
  content_script.send('player-new-id', obj);
});
popup.receive('loop-all', function (index) {
  storage.write('loop-all', index);
  updatePopup();
});
popup.receive('loop-track', function (obj) {
  loops[obj.id] = obj.loopIndex;
  updatePopup();
});
popup.receive("history-update", function () {
  updatePopup();
});
popup.receive("popupHistoryIndex", function (historyIndex) {
  storage.write("popupHistoryIndex", historyIndex);
});
popup.receive("popupVolumeIndex", function (volumeIndex) {
  storage.write("popupVolumeIndex", volumeIndex);
  content_script.send('popupVolumeIndex', volumeIndex);
});
popup.receive("delete-track", function (videoId) {
  deleteHistory(videoId);
  updatePopup();
});

// Initialization
if (!storage.read("history")) {
  storage.write([]);
}
if (!storage.read("popupHistoryIndex")) {
  storage.write('0');
}
if (!storage.read("popupVolumeIndex")) {
  storage.write('5');
}
if (!storage.read("loop-all")) {
  storage.write('0');
}
if (!storage.read("numberHistoryItems")) {
  storage.write("numberHistoryItems", '20');
}






