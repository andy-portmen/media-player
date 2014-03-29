/********/
var background = {};
if (navigator.userAgent.toLowerCase().indexOf('firefox') !== -1) {
  background.send = function (id, data) {
    self.port.emit(id, data);
  }
  background.receive = function (id, callback) {
    self.port.on(id, callback);
  }
  //background.receive("attached", function () {
  //  if (window.frameElement === null) init();
  //});
}
else {
  background.send = function (id, data) {
    chrome.extension.sendRequest({method: id, data: data});
  }
  background.receive = function (id, callback) {
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      if (request.method == id) {
        callback(request.data);
      }
    });
  }
  //init();
}
/********/
function $(id) {
  $.cache = $.cache || [];
  $.cache[id] = $.cache[id] || (window.content.document || document).getElementById(id);
  return $.cache[id];
}

function getVideoUrl()       {return window.location.href;}
function getVideoId()        {return (/watch\?v\=([^\&]*)/.exec(window.location.href) || [null,null])[1];}
function loadVideoById(id)   {window.location.replace("https://www.youtube.com/watch?v=" + id);}
function loadVideoByUrl(url) {window.location.replace(url);}
function play()              {document.body.dispatchEvent(new CustomEvent("iplayer-send-command", {detail: {cmd: "play"}}));}
function pause()             {document.body.dispatchEvent(new CustomEvent("iplayer-send-command", {detail: {cmd: "pause"}}));}
function stop()              {document.body.dispatchEvent(new CustomEvent("iplayer-send-command", {detail: {cmd: "stop"}}));}
function setVolume(v)        {document.body.dispatchEvent(new CustomEvent("iplayer-send-command", {detail: {cmd: "setVolume", volume: v}}));}
function getTitle()          {return [].reduce.call(document.getElementsByClassName("watch-title"), function (p, c) {return c.title;}, "no title 2");}
function getDuration()       {var t = [].reduce.call(document.getElementsByTagName("meta"), function (p,c) {return c.getAttribute("itemprop") == "duration" ? c.getAttribute("content") : null || p;}, null).substr(2).split(/[M,S]/); return parseInt(t[0]) * 60 + parseInt(t[1]);}

function script_inject(levels) {
  function inject_0() {
    document.body.addEventListener("iplayer-send-command", function (e) {
      var iyp_1 = document.getElementById('movie_player') || document.getElementById('movie_player-flash');
      switch (e.detail.cmd) 
      {
      case "play":
        iyp_1.playVideo();
        break;
      case "pause":
        iyp_1.pauseVideo();
        break;
      case "stop":
        iyp_1.stopVideo();
        iyp_1.clearVideo();
        break;
      case "setVolume":
        iyp_1.setVolume(e.detail.volume);
        break;
      }
    });
  }
  function inject_1() {
    var iyp_2 = document.getElementById('movie_player') || document.getElementById('movie_player-flash');
    iyp_2.addEventListener("onStateChange", "iyplayer");
  }
  function iyplayer(e) {
    document.body.dispatchEvent(new CustomEvent("iyplayer-event", {detail: {state: e}}));
  }
  var code = ['(' + inject_0 + ')();', '(' + inject_1 + ')();', iyplayer + ''];
  var script = document.createElement("script");
  script.src = "data:text/plain," + levels.map(function(e) {return code[e]}).join('');
  document.body.appendChild(script);
}

var isFirstInject = true, isHTML5Injected = false;

/*
 If the video player is Flash, 'player.addEventListener' 
 needs to be injected on every init() but, for HTML5 player, 
 only one 'player.addEventListener' injection is needed!
*/

function init() {
  if (isFirstInject) {
    isFirstInject = false;
    script_inject([0, 2]);
    document.body.addEventListener("iyplayer-event", function (e) {   
      background.send('player-state-changed', {
        state: e.detail.state,
        id: getVideoId()
      });
    });
  }
  if (isHTML5 && !isHTML5Injected) {script_inject([1]); isHTML5Injected = true;} // If the video is HTML5, then only one injection is needed!
  if (!isHTML5) {script_inject([1]);} // If the video is Flash, multiple 'player.addEventListener' injection is needed!
  background.send('request-inits');
  background.send('player-details', {
    id: getVideoId(),
    title: getTitle().toLowerCase(),
    duration: getDuration()
  });
}

background.receive("player-play", function (videoId) {
  if (videoId == getVideoId()) {
    play();
  }
});
background.receive("player-pause", function (videoId) {
  if (videoId == getVideoId() || videoId == 'all') {
    pause();
  }
});
background.receive("player-stop", function () {
  stop();
});
background.receive("player-new-id", function (obj) { 
  if (obj.id == getVideoId()) {
    loadVideoById(obj.newID);
  }
});
background.receive("popupVolumeIndex", function (vol) {
  setVolume(vol * 10 + 10);
});
background.receive("request-inits", function (obj) {
  setVolume(obj.volume * 10 + 10);
});

window.addEventListener("beforeunload", function() { 
  background.send('player-state-changed', {
    state: -1,
    id: getVideoId(),
    tabId: tabId  // Send tabId only here
  });
});