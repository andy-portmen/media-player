var background = {};

/**** wrapper (start) ****/
background.send = function (id, data) {
  self.port.emit(id, data);
}
background.receive = function (id, callback) {
  self.port.on(id, callback);
}
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
  function YouTubePlayer() {
    var p = XPCNativeWrapper.unwrap ($('movie_player') || $('movie_player-flash'));
    if (!p) return null;
    var extend = {
      getAvailableQualityLevels: () => p.getAvailableQualityLevels(),
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
      setPlaybackQuality: function (val) {
        var levels = p.getAvailableQualityLevels();
        p.setPlaybackQuality(levels.indexOf(val) != -1 ? val : levels[0])
      },
      getPlayerState: () => p.getPlayerState()
    }
    return extend;
  }
  var iyplayer = new YouTubePlayer();
  if (iyplayer) {
    var location = () => window.content.document ? window.content.document.location.href : "";
    function getVideoUrl()                {return location;}
    function getVideoId()                 {return (/[?&]v=([^&]+)/.exec(iyplayer.getVideoUrl()) || [null,null])[1];}
    function loadVideoById(id)            {window.content.document.location.href = "https://www.youtube.com/watch?v=" + id;}
    function loadVideoByUrl(url)          {window.content.document.location.href = url;}
    function play()                       {iyplayer.play();}
    function pause()                      {iyplayer.pause();}
    function stop()                       {iyplayer.stop();}
    function setVolume(v)                 {iyplayer.setVolume(v);}
    function seekTo(s)                    {iyplayer.seekTo(s);}
    function getCurrentTime()             {return iyplayer.getCurrentTime();}
    function getAvailableQualityLevels()  {return iyplayer.getAvailableQualityLevels();}
    function getTitle()                   {return iyplayer.getTitle();}
    function getDuration()                {return iyplayer.getDuration();}
    function setPlaybackQuality(q)        {iyplayer.setPlaybackQuality(q);}
    function getPlayerState()             {return iyplayer.getPlayerState();}

    function playerStateChanged(e) {
      background.send('player-details', {
        id: getVideoId(),
        title: getTitle().toLowerCase(),
        duration: getDuration()
      });
      background.send('player-state-changed', {
        state: e || getPlayerState(),
        currentTime: getCurrentTime(),
        id: getVideoId()
      });
    }
    playerStateChanged();
    
    unsafeWindow.iyplayerListener = function (e) {
      playerStateChanged(e);
    };
    iyplayer.addEventListener("onStateChange", "iyplayerListener");  

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
      background.send('iplayer-currentTime-content-script', {
        currentTime: getCurrentTime(),
        id: getVideoId()
      });
    });
    background.receive("playback-quality-update-common", function (data) {
      if (data.id == getVideoId()) {
        setPlaybackQuality(data.quality);
      }
    });
    background.receive("player-new-id", function (obj) {
      if (obj.id == getVideoId()) {
        /* unload previously played video */
        background.send('player-state-changed', {
          state: -1,
          id: obj.id,
          currentTime: 0
        });
        loadVideoById(obj.newID);
      }
    });
    background.receive("popupVolumeIndex", function (vol) {
      setVolume(vol * 10);
    });
    background.receive("request-inits", function (obj) {
      getAvailableQualityLevels(); /* Must be here to work! */
      setVolume(obj.volume * 10);
    });
    background.send('request-inits');
    
    window.addEventListener("beforeunload", function() {  
      /* unload currently played video */
      background.send('player-state-changed', {
        state: -1,
        id: getVideoId(),
        currentTime: 0
      });
    });
  }
}