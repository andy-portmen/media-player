var background = {}, manifest = {};

/**** wrapper (start) ****/
background.send = function (id, data) {
  self.port.emit(id, data);
}
background.receive = function (id, callback) {
  self.port.on(id, callback);
}
manifest.url = "resource://jid1-dgnibwqga0sibw-at-jetpack/igtranslator/";
/**** wrapper (end) ****/

if (window.frameElement === null) { // filter-out iFrame window

  function $(id) {
    $.cache = $.cache || [];
    $.cache[id] = $.cache[id] || window.content.document.getElementById(id);
    return $.cache[id];
  }

  function title () {
    if (!window.content.document) return "no title";
    return [].reduce.call(window.content.document.getElementsByClassName("watch-title"), (p, c) => c.title, "no title");
  }

  function Player (p) {
    p = XPCNativeWrapper.unwrap ($('movie_player') || $('movie_player-flash') || {});
    var extend = {
      getAvailableQualityLevels: p.getAvailableQualityLevels,
      getDuration: () => p.getDuration(),
      getTitle: () => title(),
      getVideoUrl: () => p.getVideoUrl(),
      getCurrentTime: () => p.getCurrentTime(),
      loadVideoById: (id) => p.loadVideoById(id),
      loadVideoByUrl: (url) => p.loadVideoByUrl(url),
      addEventListener: (a, b) => p.addEventListener(a, b),
      play: () => p.playVideo(),
      pause: () => p.pauseVideo(),
      setVolume: (v) => p.setVolume(v),
      seekTo: (s) => p.seekTo(s),
      stop: function () {
        if (p.seekTo) p.seekTo(0);
        p.stopVideo();
        p.clearVideo();
      },
      quality: function (val) {
        var levels = p.getAvailableQualityLevels();
        p.setPlaybackQuality(levels.indexOf(val) != -1 ? val : levels[0])
      }
    }
    return extend;
  }
  var player = new Player();

  var location = () => window.content.document ? window.content.document.location.href : "";
    
  function getVideoUrl()                {return location;}
  function getVideoId()                 {return (/[?&]v=([^&]+)/.exec(player.getVideoUrl()) || [null,null])[1];}
  function loadVideoById(id)            {location("https://www.youtube.com/watch?v=" + id);}
  function loadVideoByUrl(url)          {location(url);}
  function play()                       {player.play();}
  function pause()                      {player.pause();}
  function stop()                       {player.stop();}
  function setVolume(v)                 {player.setVolume(v);}
  function seekTo(s)                    {player.seekTo(s);}
  function getCurrentTime()             {return player.getCurrentTime();}
  function getAvailableQualityLevels()  {return player.quality();}
  function getTitle()                   {return player.getTitle();}
  function getDuration()                {return player.getDuration();}
  function setPlaybackQuality(q)        {player.setPlaybackQuality();}
 
  player.addEventListener("onStateChange", "iycenterListener");  
  unsafeWindow.iycenterListener = function (e) {
    background.send('player-state-changed', {
      state: e,
      currentTime: getCurrentTime(),
      id: getVideoId()
    });
  };

  background.send('iplayer-currentTime-content-script', {
    currentTime: getCurrentTime(),
    id: getVideoId()
  });
  background.send('iplayer-qualityLevels-content-script', {
    qualityLevels: getAvailableQualityLevels(),
    id: getVideoId()
  });
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

  window.addEventListener("beforeunload", function() {  
    background.send('player-state-changed', {
      state: -1,
      id: getVideoId(),
      currentTime: 0
    });
  });
}