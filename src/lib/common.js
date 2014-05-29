var storage, popup, window, Deferred, content_script, tab, version, icon;

/**** wrapper (start) ****/
if (typeof require !== 'undefined') { //Firefox
  var firefox = require("./firefox/firefox.js");
  ["storage", "popup", "window", "content_script", "tab", "version", "icon", "Deferred", "timer"].forEach(function (id) {
    this[id] = firefox[id];
  });
}
else if (typeof safari !== 'undefined') {  // Safari
  ["storage", "popup", "content_script", "tab", "version", "icon"].forEach(function (id) {
    this[id] = _safari[id];
  });
  Deferred = task.Deferred;
  timer = window;
}
else {  //Chrome
  ["storage", "popup", "content_script", "tab", "version", "icon"].forEach(function (id) {
    this[id] = _chrome[id];
  });
  Deferred = task.Deferred;
  timer = window;
}
/**** wrapper (end) ****/

if (storage.read("version") != version()) {
  storage.write("version", version());
  tab.open("http://add0n.com/media-player.html?version=" + version());
}

var states = {}, loops = {}, currentTimes = {}, qualityLevels = {}; tabURL = {};

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
    if (lStorage_obj.length > numberHistoryItems) lStorage_obj.shift();
    storage.write("history", JSON.stringify(lStorage_obj));
  }
}

function deleteHistory(videoId) {
  var lStorage_obj = readHistory();
  lStorage_obj = lStorage_obj.filter(function (a) {
    if (a[0] == videoId && !a[3]) {
      delete states[videoId];
      delete loops[videoId];
      delete currentTimes[videoId];
      delete qualityLevels[videoId];
      var trackQualityLevel = JSON.parse(storage.read("trackQualityLevel"));
      delete trackQualityLevel[videoId];
      storage.write("trackQualityLevel", JSON.stringify(trackQualityLevel));
      return false; 
    }
    else 
      return true;
  });
  storage.write("history", JSON.stringify(lStorage_obj));
}

function clearHistory() {
  var lStorage_obj = readHistory();
  lStorage_obj = lStorage_obj.filter(function (a) {
    if (!a[3]) {
      var videoId = a[0];
      delete states[videoId];
      delete loops[videoId];
      delete currentTimes[videoId];
      delete qualityLevels[videoId];
      var trackQualityLevel = JSON.parse(storage.read("trackQualityLevel"));
      delete trackQualityLevel[videoId];
      storage.write("trackQualityLevel", JSON.stringify(trackQualityLevel));
      return false; 
    }
    else 
      return true;
  });
  storage.write("history", JSON.stringify(lStorage_obj));
}

function updatePopup() {
  popup.send("history-update", {
    history: readHistory(),
    historyIndex: parseInt(storage.read("popupHistoryIndex")),
    volumeIndex: parseInt(storage.read("popupVolumeIndex")),
    states: states,
    loops: loops,
    currentTimes: currentTimes,
    loopIndex: parseInt(storage.read("loop-all")),
    qualityLevels: qualityLevels
  });
}

function updatecontentScript(TQL, id) {
  if (TQL[id]) {
    content_script.send("playback-quality-update-common", {
      id: id,
      quality: TQL[id]
    }, true);
  }
}

var check = (function () {
  var id;
  function doOne () {
    content_script.send('iplayer-currentTime', null, true);
  }
  return {
    start: function () {
      if (id) timer.clearInterval(id);
      id = timer.setInterval(doOne, 1000);
    },
    stop: function () {
      if (id) timer.clearInterval(id);
      id = null;
    }
  }
})();

content_script.receive("player-state-changed", function (obj) {
  states[obj.id] = obj.state;
  currentTimes[obj.id] = obj.currentTime;
  if (obj.state == 0) { // Video ended
    var loopsIndex = loops[obj.id];
    var loopIndex = parseInt(storage.read('loop-all'));
    if (loopsIndex) {
      if (loops[obj.id] < 6) {loops[obj.id] = loopsIndex - 1;}
      content_script.send('player-play', obj.id, true);
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
            }, true);
          }
          break;
        }
      }
      if (loopIndex != 6 && i == 0) {
        storage.write('loop-all', loopIndex - 1);
      }
    }
  }
  // *** icon change *** 
  if (obj.state == 1) {
    icon("pause");
    check.start();
  } 
  else if (obj.state == 0) {
    icon("stop");
    check.stop();
  }  
  else if (obj.state == 2 || obj.state == 3) {
    icon("play");
    check.stop();
  }
  else {
    icon("default");
    check.stop();
  } 
  var trackQualityLevel = JSON.parse(storage.read("trackQualityLevel"));
  updatecontentScript(trackQualityLevel, obj.id);
  updatePopup();
});
content_script.receive('player-details', function (data) {
  saveToHistory(data);
});
content_script.receive("request-inits", function () {
  content_script.send("request-inits", {
    volume: parseInt(storage.read("popupVolumeIndex"))
  }, true);
});
content_script.receive("iplayer-currentTime-content-script", function (e) {
  currentTimes[e.id] = e.currentTime;
  popup.send("iplayer-currentTime-common", currentTimes);
});
content_script.receive("iplayer-qualityLevels-content-script", function (e) {
  qualityLevels[e.id] = e.qualityLevels;
  updatePopup();
});

popup.receive('player-play', function (videoId) {
  var n = states[videoId];
  if (Math.floor(n) === n && n != -1) {
    content_script.send('player-play', videoId, true);
  } else {
    tab.open('https://www.youtube.com/watch?v=' + videoId);
  }
});
popup.receive('player-pause', function (videoId) {
  content_script.send('player-pause', videoId, true);
});
popup.receive('player-stop', function () {
  content_script.send('player-stop', null, true);
});
popup.receive('player-seek', function (obj) {
  content_script.send('player-seek', obj, true);
});
popup.receive('open-youtube', function () {
  tab.open('https://www.youtube.com');
});
popup.receive('player-new-id', function (obj) {
  content_script.send('player-new-id', obj, true);
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
  content_script.send('popupVolumeIndex', volumeIndex, true);
});
popup.receive("delete-track", function (videoId) {
  deleteHistory(videoId);
  updatePopup();
});
popup.receive("save-track", function (videoId) {
  var lStorage = storage.read("history");
  lStorage_obj = JSON.parse(lStorage); // lStorage to Hash Array
  for (var i = 0; i < lStorage_obj.length; i++) {
    if (videoId == lStorage_obj[i][0]) {
      lStorage_obj[i][3] = 'added';
      storage.write("history", JSON.stringify(lStorage_obj));
      break;
    }
  }
  updatePopup();
});
popup.receive("unsave-track", function (videoId) {
  var lStorage = storage.read("history");
  lStorage_obj = JSON.parse(lStorage); // lStorage to Hash Array
  for (var i = 0; i < lStorage_obj.length; i++) {
    if (videoId == lStorage_obj[i][0]) {
      lStorage_obj[i][3] = '';
      storage.write("history", JSON.stringify(lStorage_obj));
      break;
    }
  }
  updatePopup();
});
popup.receive("drag-update", function (data) {
  storage.write("history", JSON.stringify(data));
  updatePopup();
});
popup.receive("playback-quality-update", function (data) {
  var trackQualityLevel = JSON.parse(storage.read("trackQualityLevel"));
  trackQualityLevel[data.id] = data.quality;
  storage.write("trackQualityLevel", JSON.stringify(trackQualityLevel));
  updatecontentScript(trackQualityLevel, data.id);
});

// Initialization
if (!storage.read("history")) {
  storage.write("history", "[]");
}
if (!storage.read("trackQualityLevel")) {
  storage.write("trackQualityLevel", "{}"); // for hash
}
if (!storage.read("popupHistoryIndex")) {
  storage.write("popupHistoryIndex", '0');
}
if (!storage.read("popupVolumeIndex")) {
  storage.write("popupVolumeIndex", '5');
}
if (!storage.read("loop-all")) {
  storage.write("loop-all", '0');
}
if (!storage.read("numberHistoryItems")) {
  storage.write("numberHistoryItems", '20');
}