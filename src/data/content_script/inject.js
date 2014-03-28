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

// ******* Only for Google Chrome on HTML5 Player *******
if (window.navigator.vendor.match(/Google/)) {
  (function () {
    function inject() {
      var iyp = document.getElementById('movie_player') || document.getElementById('movie_player-flash');
      iyp.addEventListener("onStateChange", "iyplayer");
      document.body.addEventListener("iplayer-send-command", function (e) {
        switch (e.detail.cmd) 
        {
        case "play":
          iyp.playVideo();
          break;
        case "pause":
          iyp.pauseVideo();
          break;
        case "stop":
          iyp.stopVideo();
          iyp.clearVideo();
          break;
        case "setVolume":
          iyp.setVolume(e.detail.volume);
          break;
        }
      });
    }
    var code = 'function iyplayer(e) {document.body.dispatchEvent(new CustomEvent("iyplayer-event", {detail: {state: e}}));}' + '(' + inject + ')();';
    var script = document.createElement("script");
    script.src = "data:text/plain," + code;
    document.body.appendChild(script);
  })();
};
function getVideoUrl()       {return window.location.href;}
function getVideoId()        {return (/watch\?v\=([^\&]*)/.exec(window.location.href) || [null,null])[1];}
function loadVideoById(id)   {window.location.replace("https://www.youtube.com/watch?v=" + id);}
function loadVideoByUrl(url) {window.location.replace(url);}
function play()              {document.body.dispatchEvent(new CustomEvent("iplayer-send-command", {detail: {cmd: "play"}}));}
function pause()             {document.body.dispatchEvent(new CustomEvent("iplayer-send-command", {detail: {cmd: "pause"}}));}
function stop()              {document.body.dispatchEvent(new CustomEvent("iplayer-send-command", {detail: {cmd: "stop"}}));}
function setVolume(v)        {document.body.dispatchEvent(new CustomEvent("iplayer-send-command", {detail: {cmd: "setVolume", volume: v}}));}
// *******************

var player;
function youtube (callback, pointer) {
  function Player () {
    var p = $('movie_player') || $('movie_player-flash') || {};
    p = (typeof XPCNativeWrapper != "undefined") ? XPCNativeWrapper.unwrap (p) : p;
    var extend = {
      getAvailableQualityLevels: p.getAvailableQualityLevels,
      getDuration:      function ()     {return p.getDuration ? p.getDuration() : 0},
      getTitle:         function ()     {if (!window.content.document && !document) return "no title 1"; return [].reduce.call((window.content.document || document).getElementsByClassName("watch-title"), function (p, c) {return c.title;}, "no title 2");},
      getVideoUrl:      function ()     {return p.getVideoUrl() || getVideoUrl()},
      getVideoId:       function ()     {if (p.getVideoUrl) {return (/[?&]v=([^&]+)/.exec(p.getVideoUrl()) || [null,null])[1];} else {return getVideoId();}},
      loadVideoById:    function (id)   {if (p.loadVideoById) {p.loadVideoById(id);} else {loadVideoById();}},
      loadVideoByUrl:   function (url)  {if (p.loadVideoByUrl) {p.loadVideoByUrl(url);} else {loadVideoByUrl(url);}},
      addEventListener: function (a, b) {return p.addEventListener(a, b)},
      play:             function ()     {if (p.playVideo) {p.playVideo();} else {play();}},
      pause:            function ()     {if (p.pauseVideo) {p.pauseVideo();} else {pause();}},
      setVolume:        function (v)    {if ("setVolume" in p) {p.setVolume(v);} else {setVolume(v);}},
      stop:             function ()     {if (p.stopVideo) {if (p.seekTo) p.seekTo(0); p.stopVideo(); p.clearVideo();} else {stop();}},
      quality:          function (val)  {var levels = p.getAvailableQualityLevels();p.setPlaybackQuality(levels.indexOf(val) != -1 ? val : levels[0])}
    }
    return extend;
  }
  player = new Player();
  if (true){ // if (player && player.getAvailableQualityLevels) {  
    callback.call(pointer);
  }
}

function init() {
  youtube(function () {    
    background.send('request-inits');
    background.send('player-details', {
      id: player.getVideoId(),
      title: player.getTitle().toLowerCase(),
      duration: player.getDuration()
    });
    // inject new listener to unsafe window
    if (typeof unsafeWindow != "undefined") { // Firefox
      unsafeWindow.iyplayer = function (e) {
        background.send('player-state-changed', {
          state: e,
          id: player.getVideoId()
        });
      }
    }
    else {  // ******* This is Only for Chrome Browser *******
      document.body.addEventListener("iyplayer-event", function (e) {   
        background.send('player-state-changed', {
          state: e.detail.state,
          id: player.getVideoId()
        });
      });
    }
  });
}

background.receive("player-play", function (videoId) {
  if (videoId == player.getVideoId()) {
    player.play();
  }
});
background.receive("player-pause", function (videoId) {
  if (videoId == player.getVideoId() || videoId == 'all') {
    player.pause();
  }
});
background.receive("player-stop", function () {
  player.stop();
});
background.receive("player-new-id", function (obj) { 
  if (obj.id == player.getVideoId()) {
    window.location.replace("https://www.youtube.com/watch?v=" + obj.newID);
  }
});
background.receive("popupVolumeIndex", function (vol) {
  player.setVolume(vol * 10 + 10);
});
background.receive("request-inits", function (obj) {
  player.setVolume(obj.volume * 10 + 10);
});

window.addEventListener("beforeunload", function() { 
  background.send('player-state-changed', {
    state: -1,
    id: player.getVideoId(),
    tabId: tabId  // Send tabId only here
  });
});