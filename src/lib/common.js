var get, Promise, parser, storage, popup, window, Deferred, content_script, tab, version, icon, timer, options;

/**** wrapper (start) ****/
if (typeof require !== 'undefined') { //Firefox
  var config = require('./config');
  var firefox = require("./firefox/firefox");
  ["get", "Promise", "parser", "storage", "popup", "window", "content_script", "tab", "version", "icon", "Deferred", "timer", "options"].forEach(function (id) {
    this[id] = firefox[id];
  });
}
else if (typeof safari !== 'undefined') {  // Safari
  ["get", "Promise", "parser", "storage", "popup", "content_script", "tab", "version", "icon", "options"].forEach(function (id) {
    this[id] = _safari[id];
  });
  Deferred = Promise.Deferred;
  timer = window;
}
else {  //Chrome
  ["get", "Promise", "parser", "storage", "popup", "content_script", "tab", "version", "icon", "options"].forEach(function (id) {
    this[id] = _chrome[id];
  });
  Deferred = Promise.Deferred;
  timer = window;
}
/**** wrapper (end) ****/

var states = {}, loops = {}, currentTimes = {}, qualityLevels = {}, YouTubePlayList = [];

if (config.welcome.version != version()) {
  config.welcome.version = version();
  timer.setTimeout(function () {
    tab.open("http://add0n.com/media-player.html?version=" + version());
  }, config.welcome.timeout * 1000);
}

/* Fetch YouTube Playlist */
function fetchYouTubePlaylist(callback) {
  YouTubePlayList = [];
  get("https://www.youtube.com/").then(function (data) {
    function extractData(data) {
      var doc = parser.parseFromString(data, "text/html");
      var items = doc.querySelectorAll("tr[class*='pl-video']");
      var playListTitle = doc.querySelector("meta[name='title']").getAttribute("content").toLowerCase();
      var playListHref = doc.querySelector("link[rel='canonical']").getAttribute("href");
      var account = doc.querySelector("a[class*='yt-masthead-picker-active-account']").textContent;
      var YouTubePlayListItems = {
        account: account,
        href: playListHref,
        title: playListTitle,
        include: storage.read(playListTitle) || 'false',
        videos: []
      };
      for (var j = 0; j < items.length; j++) {
        var obj = {
          id: items[j].getAttribute("data-video-id"),
          title: items[j].getAttribute("data-title").toLowerCase(),
          duration: items[j].getAttribute("data-length-in-seconds"),
          addToFavorite: ''
        };
        YouTubePlayListItems.videos.push(obj);
      }
      YouTubePlayList.push(YouTubePlayListItems);
    }
    var YouTubePlayListUrls = [];
    if (data) {
      var doc = parser.parseFromString(data, "text/html");
      if (doc) {
        var playlist = doc.querySelectorAll("a[class*='guide-item']");
        for (var i = 0; i < playlist.length; i++) {
          var url = playlist[i].getAttribute("href");
          if (url.indexOf("/playlist?") != -1) {
            YouTubePlayListUrls.push("https://www.youtube.com" + url);
          }
        }
        Promise.all(YouTubePlayListUrls.map(function(url) {return get(url)})).then(function (arr) {
          callback(arr.map(extractData));
        });
      }
    }
  });
}
fetchYouTubePlaylist(function () {});

function saveToHistory(data) {
  if (!data.id || !data.title) return;
  var numberHistoryItems = config.youtube.numberHistoryItems;
  var history = config.youtube.history;
  for (var i = 0; i < history.length; i++) {
    if (data.id == history[i][0]) return;
  }
  history.push([data.id, data.title, data.duration]);
  if (history.length > numberHistoryItems) history.shift();
  config.youtube.history = history;
}

function deleteHistory(videoId) {
  var obj = config.youtube.history;
  obj = obj.filter(function (a) {
    if (a[0] === videoId && !a[3]) {
      delete states[videoId];
      delete loops[videoId];
      delete currentTimes[videoId];
      delete qualityLevels[videoId];
      var trackQualityLevel = config.youtube.trackQualityLevel;
      delete trackQualityLevel[videoId];
      config.youtube.trackQualityLevel = trackQualityLevel;
      return false;
    }
    else {
      return true;
    }
  });
  config.youtube.history = obj;
}

function clearHistory() {
  var obj = config.youtube.history;
  obj = obj.filter(function (a) {
    if (!a[3]) {
      var videoId = a[0];
      delete states[videoId];
      delete loops[videoId];
      delete currentTimes[videoId];
      delete qualityLevels[videoId];
      var trackQualityLevel = config.youtube.trackQualityLevel;
      delete trackQualityLevel[videoId];
      config.youtube.trackQualityLevel = trackQualityLevel;
      return false;
    }
    else
      return true;
  });
  config.youtube.history = obj;
}

function updatePopup() {
  popup.send("history-update", {
    color: config.popup.color,
    history: config.youtube.history,
    historyIndex: config.youtube.popupHistoryIndex,
    volumeIndex: config.youtube.popupVolumeIndex,
    states: states,
    loops: loops,
    currentTimes: currentTimes,
    loopIndex: config.youtube.loopAll,
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
  if (obj.state == 0) { /* video is ended */
    var loopsIndex = loops[obj.id];
    var loopIndex = config.youtube.loopAll;
    if (loopsIndex) {
      if (loops[obj.id] < 6) {loops[obj.id] = loopsIndex - 1;}
      content_script.send('player-play', obj.id, true);
    }
    else if (loopIndex) {
      var i;
      var history = config.youtube.history;
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
        config.youtube.loopAll = loopIndex - 1;
      }
    }
  }
  /* toolbar-popup change icon */
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
  var trackQualityLevel = config.youtube.trackQualityLevel;
  updatecontentScript(trackQualityLevel, obj.id);
  updatePopup();
});
content_script.receive('player-details', function (data) {
  saveToHistory(data);
});
content_script.receive("request-inits", function () {
  content_script.send("request-inits", {
    volume: config.youtube.popupVolumeIndex
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
  config.youtube.loopAll = index;
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
  config.youtube.popupHistoryIndex = historyIndex;
});
popup.receive("popupVolumeIndex", function (volumeIndex) {
  config.youtube.popupVolumeIndex = volumeIndex;
  content_script.send('popupVolumeIndex', volumeIndex, true);
});
popup.receive("delete-track", function (videoId) {
  deleteHistory(videoId);
  updatePopup();
});
popup.receive("save-track", function (videoId) {
  var obj = config.youtube.history;
  for (var i = 0; i < obj.length; i++) {
    if (videoId == obj[i][0]) {
      obj[i][3] = 'added';
      config.youtube.history = obj;
      break;
    }
  }
  updatePopup();
});
popup.receive("unsave-track", function (videoId) {
  var obj = config.youtube.history;
  for (var i = 0; i < obj.length; i++) {
    if (videoId == obj[i][0]) {
      obj[i][3] = '';
      config.youtube.history = obj;
      break;
    }
  }
  updatePopup();
});
popup.receive("drag-update", function (data) {
  config.youtube.history = data;
  updatePopup();
});
popup.receive("playback-quality-update", function (data) {
  var trackQualityLevel = config.youtube.trackQualityLevel;
  trackQualityLevel[data.id] = data.quality;
  config.youtube.trackQualityLevel = trackQualityLevel;
  updatecontentScript(trackQualityLevel, data.id);
});
popup.receive("open-options-page", function () {
  tab.openOptions();
});

/* options page */
function playList(e, c) {
  for (var i = 0; i < YouTubePlayList.length; i++) {
    if (YouTubePlayList[i].title == e) {
      if (c == 'a') {
        YouTubePlayList[i].include = 'true';
        storage.write(YouTubePlayList[i].title, 'true');
      }
      if (c == 'r') {
        YouTubePlayList[i].include = 'false';
        storage.write(YouTubePlayList[i].title, 'false');
      }
      for (var j = 0; j < YouTubePlayList[i].videos.length; j++) {
        if (c == 'a') saveToHistory(YouTubePlayList[i].videos[j]);
        if (c == 'r') deleteHistory(YouTubePlayList[i].videos[j].id);
      }
    }
  }
}
options.receive("youtube-history-table", function () {
  function OSYHT() {
    options.send("youtube-history-table", {
      history: config.youtube.history,
      playlist: YouTubePlayList
    });
  }
  OSYHT();                       /* 1. send data to popup right after message received     */
  fetchYouTubePlaylist(OSYHT);   /* 2. send data to popup after fetching data from YouTube */
});
options.receive("add-youtube-playlist", function (e) {
  playList(e, 'a');
});
options.receive("remove-youtube-playlist", function (e) {
  playList(e, 'r');
});
options.receive("changed", function (o) {
  config.set(o.pref, o.value);
  options.send("set", {
    pref: o.pref,
    value: config.get(o.pref)
  });
});
options.receive("get", function (pref) {
  options.send("set", {
    pref: pref,
    value: config.get(pref)
  });
});