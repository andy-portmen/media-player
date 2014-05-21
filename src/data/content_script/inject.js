/********/
var background = {};
if (navigator.userAgent.toLowerCase().indexOf('firefox') !== -1) {
  background.send = function (id, data) {
    self.port.emit(id, data);
  }
  background.receive = function (id, callback) {
    self.port.on(id, callback);
  }
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
}
/********/

var isFirstInject = true, isHTML5Injected = false;
var global_currentTime = 0, global_qualityLevels = [];
var isHTML5 = false, currentVideoID = "";
    
if (window.frameElement === null) { // filter-out iFrame window

  function $(id) {
    return (window.content.document || document).getElementById(id);
  }

  window.addEventListener('DOMContentLoaded', function () { /* trigger */ 
    var pagecontainer = document.getElementById('page-container');
    if (!pagecontainer) return;
    if (/^https?:\/\/www\.youtube.com\/watch\?/.test(window.location.href)) init();
    var isAjax = /class[\w\s"'-=]+spf\-link/.test(pagecontainer.innerHTML);
    var content = document.getElementById('content');
    if (isAjax && content) { // Ajax UI
      var mo = window.MutationObserver || window.WebKitMutationObserver;
      if (typeof mo !== 'undefined') {
        var observer = new mo(function (mutations) {
          mutations.forEach(function (mutation) {
            if (mutation.addedNodes !== null) {
              for (var i = 0; i < mutation.addedNodes.length; i++) {
                if (mutation.addedNodes[i].id == 'watch7-container') {
                  init();
                  break;
                }
              }
            }
          });
        });
        observer.observe(content, {
          childList: true,
          subtree: true
        });
      }
    }
  }, false);
  
  function init() {
    if (currentVideoID) { // unload previously played video
      background.send('player-state-changed', {
        state: -1,
        id: currentVideoID,
        currentTime: 0
      });
    }
    currentVideoID = getVideoId();
    if (isFirstInject) {
      isFirstInject = false;
      document.body.addEventListener("iyplayer-event", function (e) {
        background.send('player-state-changed', {
          state: e.detail.state,
          currentTime: global_currentTime,
          id: getVideoId()
        });
      });
      script_inject([0, 2, 3]);
    }
    if (isHTML5 && !isHTML5Injected) {script_inject([1]); isHTML5Injected = true;} // If the video is HTML5, then only one injection is needed!
    if (!isHTML5) {script_inject([1]);} // If the video is Flash, multiple 'player.addEventListener' injection is needed!
    background.send('request-inits');
    background.send('player-details', {
      id: getVideoId(),
      title: getTitle().toLowerCase(),
      duration: getDuration()
    });
    
    // Adding listeners when document is ready
    document.body.addEventListener("iplayer-currentTime-event", function (e) {
      global_currentTime = e.detail.time;
      background.send('iplayer-currentTime-content-script', {
        currentTime: e.detail.time,
        id: getVideoId()
      });
    });
    document.body.addEventListener("iplayer-qualityLevels-event", function (e) {
      global_qualityLevels = e.detail.quality;
      if (global_qualityLevels) {
        background.send('iplayer-qualityLevels-content-script', {
          qualityLevels: e.detail.quality,
          id: getVideoId()
        });
      }
    });
  
    function getVideoUrl()                {return window.location.href;}
    function getVideoId()                 {return (/watch\?v\=([^\&]*)/.exec(window.location.href) || [null,null])[1];}
    function loadVideoById(id)            {window.location.replace("https://www.youtube.com/watch?v=" + id);}
    function loadVideoByUrl(url)          {window.location.replace(url);}
    function play()                       {document.body.dispatchEvent(new CustomEvent("iplayer-send-command", {detail: {cmd: "play"}}));}
    function pause()                      {document.body.dispatchEvent(new CustomEvent("iplayer-send-command", {detail: {cmd: "pause"}}));}
    function stop()                       {document.body.dispatchEvent(new CustomEvent("iplayer-send-command", {detail: {cmd: "stop"}}));}
    function setVolume(v)                 {document.body.dispatchEvent(new CustomEvent("iplayer-send-command", {detail: {cmd: "setVolume", volume: v}}));}
    function seekTo(s)                    {document.body.dispatchEvent(new CustomEvent("iplayer-send-command", {detail: {cmd: "seekTo", second: s}}));}
    function getCurrentTime()             {document.body.dispatchEvent(new CustomEvent("iplayer-send-command", {detail: {cmd: "currentTime"}}));}
    function getAvailableQualityLevels()  {document.body.dispatchEvent(new CustomEvent("iplayer-send-command", {detail: {cmd: "getQualityLevels"}}));}
    function getTitle()                   {return [].reduce.call(document.getElementsByClassName("watch-title"), function (p, c) {return c.title;}, "no title");}
    function getDuration()                {var t = [].reduce.call(document.getElementsByTagName("meta"), function (p,c) {return c.getAttribute("itemprop") == "duration" ? c.getAttribute("content") : null || p;}, null).substr(2).split(/[M,S]/); return parseInt(t[0]) * 60 + parseInt(t[1]);}
    function setPlaybackQuality(q)        {document.body.dispatchEvent(new CustomEvent("iplayer-send-command", {detail: {cmd: "setPlaybackQuality", quality: q}}));}

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
          case "seekTo":
            iyp_1.seekTo(e.detail.second, true);
            break;
          case "currentTime":
            var currentTime = iyp_1.getCurrentTime();
            document.body.dispatchEvent(new CustomEvent("iplayer-currentTime-event", {detail: {time: currentTime}}));
            break;
          case "getQualityLevels":
            var qualityLevels = iyp_1.getAvailableQualityLevels();
            document.body.dispatchEvent(new CustomEvent("iplayer-qualityLevels-event", {detail: {quality: qualityLevels}}));
            break;
          case "setPlaybackQuality":
            iyp_1.setPlaybackQuality(e.detail.quality);
            break;
          }
        });
      }
      function inject_1() {
        var iyp_2 = document.getElementById('movie_player') || document.getElementById('movie_player-flash');
        iyp_2.addEventListener("onStateChange", "iyplayer");
      }
      function iyplayer(e) {
        var iyp_3 = document.getElementById('movie_player') || document.getElementById('movie_player-flash');
        document.body.dispatchEvent(new CustomEvent("iyplayer-event", {detail: {state: e || iyp_3.getPlayerState()}}));
      }
      
      // code[3] is to get the state manually at start -> iyplayer()
      var code = ['(' + inject_0 + ')();', '(' + inject_1 + ')();', iyplayer + '', '(' + iyplayer + ')();'];
      var script = document.createElement("script");
      script.src = "data:text/plain," + levels.map(function(e) {return code[e]}).join('');
      document.body.appendChild(script);
    }

    /*
     If the video player is Flash, 'player.addEventListener' 
     needs to be injected on every init() but, for HTML5 player, 
     only one 'player.addEventListener' injection is needed!
    */

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
      seekTo(0); // due to a bug in stop
      pause();
    });
    background.receive("player-seek", function (obj) {
      if (obj.videoId == getVideoId()) {
        seekTo(obj.second);
      }
    });
    background.receive("iplayer-currentTime", function () {
      getCurrentTime();
    });
    background.receive("playback-quality-update-common", function (data) {
      if (data.id == getVideoId()) {
        setPlaybackQuality(data.quality);
      }
    });

    background.receive("player-new-id", function (obj) { 
      if (obj.id == getVideoId()) {
        loadVideoById(obj.newID);
      }
    });
    background.receive("popupVolumeIndex", function (vol) {
      setVolume(vol * 10);
    });
    background.receive("request-inits", function (obj) {
      getAvailableQualityLevels(); // Must be here to work!
      setVolume(obj.volume * 10);
    });
  }
  
  window.addEventListener("beforeunload", function() {  
    background.send('player-state-changed', {
      state: -1,
      id: currentVideoID,
      currentTime: 0
    });
  });
}