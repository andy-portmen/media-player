var background = {};
/**** wrapper (start) ****/
if (typeof chrome !== 'undefined') {  // Chrome
  background.send = function (id, data) {
    chrome.extension.sendRequest({method: id, data: data});
  }
  background.receive = function (id, callback) {
    chrome.extension.onRequest.addListener(function(request, sender, callback2) {
      if (request.method == id) {
        callback(request.data);
      }
    });
  }
  window.setTimeout(function () {
    init();
  }, 100);
}
else if (typeof safari !== 'undefined') { // Safari
  background = (function () {
    var callbacks = {};
    return {
      send: function (id, data) {
        safari.extension.globalPage.contentWindow.popup.dispatchMessage(id, data);
      },
      receive: function (id, callback) {
        callbacks[id] = callback;
      },
      dispatchMessage: function (id, data) {
        if (callbacks[id]) {
          callbacks[id](data);
        }
      }
    }
  })();
  var doResize = function () {
    safari.self.width = document.body.getBoundingClientRect().width + 10;
    safari.self.height = document.body.getBoundingClientRect().height + 10;
  }
  window.addEventListener("resize", doResize, false);
  safari.application.addEventListener("popover", function (){
    window.setTimeout(function () {
      init();
    }, 100);
  }, false);
}
else {  // Firefox
  background.send = function (id, data) {
    self.port.emit(id, data);
  }
  background.receive = function (id, callback) {
    self.port.on(id, callback);
  }
  var doResize = function () {
    self.port.emit("resize", {
      w: document.body.getBoundingClientRect().width,
      h: document.body.getBoundingClientRect().height
    });
  }
  window.addEventListener("resize", doResize, false);
  self.port.on("show", function () {
    init();
  });
}
/**** wrapper (end) ****/

var states, currentTimes, YouTubeHistory = [], historyIndex, globalStatus = '', BSB = 347, ZP = 54;

function $ (id) {
  return document.getElementById(id);
}

function init() {
  background.send('history-update');
  AddListeners(htmlElements);
}

function secondsToHms(seconds) {
  var str1, str2;
  seconds = Number(seconds);
  var m = Math.floor(seconds / 60);
  var s = Math.floor(seconds - m * 60);
  str1 = m.toString();
  if (s < 10) {str2 = '0' + s.toString();} else {str2 = s.toString();}
  var time = str1 + ":" + str2;
  return (time);
}

function color(c) {
  function hexToRgb(hex) {
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
  }
  var rgb = hexToRgb(c);
  var color = "rgba(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ", 0.6)";
  var hover = "rgba(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ", 1.0)";

  var css0 = "#play-td,#play-td[name='play'],#play-td[name='pause'] {background-color: " + color + ";}";
  var css1 = "#previous-td,#next-td,#stop-td,#volume-td,#loop-all-td,#options-td {background-color: " + color + ";}";
  var css2 = "#loop-all-td[loopIndex='0'],#loop-all-td[loopIndex='1'],#loop-all-td[loopIndex='2'],#loop-all-td[loopIndex='3'],#loop-all-td[loopIndex='4'],#loop-all-td[loopIndex='5'],#loop-all-td[loopIndex='6'] {background-color: " + color + ";}";
  var css3 = "#items-table tr td{background-color: " + color + " !important;}";
  var css4 = "#items-table tr td:hover {background-color: " + hover + " !important;}";
  var css5 = "#scroll-up-td:hover,#scroll-down-td:hover{background-color: " + hover + ";}"
  var css6 = "#volume-td div {background-color: " + hover + ";}";
  var css7 = "#controls-table tr td {color: " + hover + "}";
  var css = css0 + css1 + css2 + css3 + css4 + css5 + css6 + css7;

  var style = document.createElement('style');
  if (style.styleSheet) style.styleSheet.cssText = css;
  else {
    style.appendChild(document.createTextNode(css));
    document.getElementsByTagName('head')[0].appendChild(style);
  }
}

background.receive('iplayer-currentTime-common', function (currentTimes) {
  var trs = $('items-table').getElementsByTagName('tr');
  [].forEach.call(trs, function(tr, index) {
    if (tr.getAttribute('state') == 'play') {
      var tr_duration = parseInt(tr.getAttribute('duration'));
      var tr_videoId = tr.getAttribute('videoId');
      var currentTime = currentTimes[tr_videoId];
      var X = Math.round((currentTime / tr_duration) * BSB) - BSB;
      tr.getElementsByTagName("td")[2].setAttribute('X', X);
      tr.getElementsByTagName("td")[2].setAttribute('currentTime', currentTime);
      tr.getElementsByTagName("td")[2].style.backgroundPosition = X.toString() + 'px center';
      tr.getElementsByTagName("td")[3].textContent = secondsToHms(currentTime) + ' / ' + secondsToHms(tr_duration);
    }
  });
});

function setVolume(vol) {
  var td = $("volume-td");
  for (var i = 0; i < 11; i++) {
    if (i <= vol) {td.children[i].setAttribute('name', 'selected');}
    else {td.children[i].removeAttribute('name');}
  }
  background.send("popupVolumeIndex", vol);
}

background.receive('history-update', function (obj) {
  color(obj.color);
  YouTubeHistory = obj.history.reverse();
  states = obj.states;
  currentTimes = obj.currentTimes;
  loops = obj.loops;
  var qualityLevels = obj.qualityLevels;
  setVolume(obj.volumeIndex);
  $("loop-all-td").setAttribute("loopIndex", obj.loopIndex);
  var isPlay = false;  // Play button
  for (id in states) {isPlay = isPlay || (states[id] == 1);}
  $("play-td").setAttribute('name', isPlay ? 'pause' : 'play');
  if (typeof historyIndex == 'undefined') {historyIndex =  obj.historyIndex;}
  var trs = $('items-table').getElementsByTagName('tr');
  // Making sure the historyIndex is working fine
  if (historyIndex < 0) {historyIndex = 0;}
  if (YouTubeHistory.length <= trs.length) {historyIndex = 0;}
  else if ((historyIndex + trs.length > YouTubeHistory.length - 1)) {
    historyIndex = YouTubeHistory.length - trs.length;
  }
  $("input").value = globalStatus;
  [].forEach.call(trs, function(tr, index) {
    var q = index + historyIndex;
    if (q < YouTubeHistory.length) {
      var videoId = YouTubeHistory[q][0];
      var title = YouTubeHistory[q][1];
      var duration = YouTubeHistory[q][2];
      var addToFavorite = YouTubeHistory[q][3] || '';
      var currentTime = currentTimes[videoId] || 0;
      var X = Math.round((currentTime / duration) * BSB) - BSB;
      tr.getElementsByTagName("td")[2].textContent = title;
      tr.getElementsByTagName("td")[3].textContent = secondsToHms(currentTime) + ' / ' + secondsToHms(parseInt(duration));
      tr.getElementsByTagName("td")[2].style.backgroundPosition = X.toString() + 'px center';
      tr.getElementsByTagName("td")[6].setAttribute('status', addToFavorite);
      var levels = qualityLevels[videoId];
      var select = tr.getElementsByTagName("select")[0]; select.innerHTML = '';
      if (levels) {
        var option = document.createElement("option");
        option.text = 'please select'; option.value = ''; select.add(option);
        for (var i = 0; i < levels.length; i++) {
          var option = document.createElement("option");
          option.text = levels[i]; option.value = levels[i]; select.add(option);
          select.setAttribute('state', 'full');
        }
      }
      /* play (1), ended (0), paused (2), loading (3), video cued /stop (5) or unstarted (-1)*/
      switch (states[videoId]) {
      case 0: // Ended
        tr.setAttribute('state', 'end');
        break;
      case 1: // Play
        tr.setAttribute('state', 'play');
        globalStatus = title;
        $("input").value = globalStatus;
        $("input").style.opacity = 0.5;
        break;
      case 2: // Pause
        tr.setAttribute('state', 'pause');
        break;
      case 3: // Loading
        tr.setAttribute('state', 'loading');
        tr.getElementsByTagName("td")[3].textContent = '';
        break;
      case 5: // Video Stopped
        tr.setAttribute('state', 'stop');
        tr.getElementsByTagName("td")[2].style.backgroundPosition = '-' + BSB + 'px center';
        tr.getElementsByTagName("td")[3].textContent = secondsToHms(0) + ' / ' + secondsToHms(parseInt(duration));
        break;
      default: // Closed
        tr.getElementsByTagName("td")[2].style.backgroundPosition = '-' + BSB + 'px center';
        tr.removeAttribute('state');
      }
      tr.getElementsByTagName('td')[5].setAttribute("loopIndex", loops[videoId]);
      tr.setAttribute('videoId', videoId);
      tr.setAttribute('duration', duration);
    }
    else {
      tr.getElementsByTagName("select")[0].innerHTML = '';
      tr.getElementsByTagName("select")[0].removeAttribute('state');
      tr.getElementsByTagName("td")[2].style.backgroundPosition = '-' + BSB + 'px center';
      tr.getElementsByTagName("td")[2].textContent = "";
      tr.getElementsByTagName("td")[3].textContent = "";
      tr.getElementsByTagName("td")[6].setAttribute('status', '');
      tr.removeAttribute('state');
      tr.removeAttribute('videoId');
      tr.removeAttribute('duration');
    }
  });
  background.send('popupHistoryIndex', historyIndex);
});

// Listeners: addEventListener
$('play-td').addEventListener('click', function () {
  if ($('play-td').getAttribute('name') == 'play') {
    var getId; // the id for paused/stopped video
    for (id in states) { // find a random video and play it
      if (states[id] === 2) {
        getId = id;
        break;
      }
    }
    if (getId) {
      background.send("player-play", getId);
    }
    else {
      if (!YouTubeHistory.length)
        background.send("open-youtube");
      else if (YouTubeHistory && YouTubeHistory.length && YouTubeHistory[0][0])
        background.send("player-play", YouTubeHistory[0][0]);
    }
  }
  else {
    background.send("player-pause", "all");
  }
}, false);

$('next-td').addEventListener('click', function () {
  for (var i = 0; i < YouTubeHistory.length - 1; i++) {
    if (states[YouTubeHistory[i][0]] == 1 || states[YouTubeHistory[i][0]] == 2) {
      background.send("player-new-id", {
        id: YouTubeHistory[i][0],
        newID: YouTubeHistory[i+1][0]
      });
      break;
    }
  }
}, false);

$('previous-td').addEventListener('click', function () {
  for (var i = 1; i < YouTubeHistory.length; i++) {
    if (states[YouTubeHistory[i][0]] == 1 || states[YouTubeHistory[i][0]] == 2) {
      background.send("player-new-id", {
        id: YouTubeHistory[i][0],
        newID: YouTubeHistory[i-1][0]
      });
      break;
    }
  }
}, false);

$('stop-td').addEventListener('click', function () {
  background.send("player-stop");
}, false);

$("loop-all-td").addEventListener('click',function () {
  var index = parseInt($("loop-all-td").getAttribute("loopIndex")) || 0;
  index++;
  if (index > 6) index = 0;
  background.send("loop-all", index);
}, false);

$('volume-td').addEventListener('click', function (e) {
  var target = e.originalTarget || e.target;
  if (target.localName == "div") {
    var vol = parseInt(target.getAttribute('value'));
    setVolume(vol);
  }
}, false);

$('options-td').addEventListener('click', function (e) {
  background.send("open-options-page");
}, false);

function setQ(e) {
  var target = e.target || e.originalTarget;
  var quality = target.children[target.selectedIndex].getAttribute("value");
  var id = target.parentNode.parentNode.getAttribute('videoId');
  background.send("playback-quality-update", {
    id: id,
    quality: quality
  });
}

$("items-table").getElementsByTagName('select')[0].addEventListener("change", function (e) {setQ(e)}, false);
$("items-table").getElementsByTagName('select')[1].addEventListener("change", function (e) {setQ(e)}, false);
$("items-table").getElementsByTagName('select')[2].addEventListener("change", function (e) {setQ(e)}, false);
$("items-table").getElementsByTagName('select')[3].addEventListener("change", function (e) {setQ(e)}, false);
$("items-table").getElementsByTagName('select')[4].addEventListener("change", function (e) {setQ(e)}, false);

$("items-table").addEventListener('mouseover', function (e) {
  var target = e.originalTarget || e.target;
  if (target.localName === "td") {
    var current_tr = target.parentNode;
    var trs = $('items-table').getElementsByTagName('tr');
    var flag_1 = current_tr.getElementsByTagName('td')[7] == target;
    var flag_2 = current_tr.getElementsByTagName('td')[6] == target;
    var flag_3 = current_tr.getElementsByTagName('td')[5] == target;
    var flag_4 = current_tr.getElementsByTagName('td')[4] == target;
    var flag_5 = target.getElementsByTagName('select') == target;
    if (flag_1 || flag_2 || flag_3 || flag_4 || flag_5) {
      [].forEach.call(trs, function(tr, index) {
        tr.getElementsByTagName("td")[2].setAttribute('name', 'track-expand');
        tr.getElementsByTagName("td")[4].setAttribute('name', 'close-track-expand');
        tr.getElementsByTagName("td")[5].setAttribute('name', 'loop-track-expand');
        tr.getElementsByTagName("td")[6].setAttribute('name', 'save-track-expand');
        tr.getElementsByTagName("td")[7].setAttribute('name', 'quality-td-expand');
      });
    }
    else {
      [].forEach.call(trs, function(tr, index) {
        tr.getElementsByTagName("td")[2].setAttribute('name', 'track');
        tr.getElementsByTagName("td")[4].setAttribute('name', 'close-track');
        tr.getElementsByTagName("td")[5].setAttribute('name', 'loop-track');
        tr.getElementsByTagName("td")[6].setAttribute('name', 'save-track');
        tr.getElementsByTagName("td")[7].setAttribute('name', 'quality-td');
      });
    }
  }
}, false);

$("items-table").addEventListener('click', function (e) {
  var target = e.originalTarget || e.target;
  if (target.localName === "td") {
    var tr = target.parentNode;
    if (tr.getElementsByTagName('td')[4] == target) {
      background.send('delete-track', tr.getAttribute('videoId'));
    }
    else if (tr.getElementsByTagName('td')[5] == target) {
      var index = parseInt(target.getAttribute("loopIndex")) || 0;
      index++;
      if (index > 6) index = 0;
      background.send("loop-track", {
        id: tr.getAttribute('videoId'),
        loopIndex: index
      });
    }
    else if (tr.getElementsByTagName('td')[6] == target) {
      if (target.getAttribute('status') == '')
        background.send('save-track', tr.getAttribute('videoId'));
      else
        background.send('unsave-track', tr.getAttribute('videoId'));
    }
    else if (tr.getElementsByTagName('td')[2] == target) {
      if (tr.getAttribute('state') == 'play') {
        var videoId = tr.getAttribute('videoId');
        var duration = parseInt(tr.getAttribute('duration'));
        var second = Math.round(((e.clientX - ZP) / BSB) * duration); // ZP --- BSB
        background.send('player-seek', {
          second: second,
          videoId: videoId
        });
      }
    }
    else {
      var videoId = tr.getAttribute('videoId');
      background.send(states[videoId] == 1 ? 'player-pause' : 'player-play', videoId);
    }
  }
}, false);

$('scroll-up-td').addEventListener('click', function () {
  historyIndex -= 1;
  background.send("history-update");
}, false);

$('scroll-down-td').addEventListener('click', function () {
  historyIndex += 1;
  background.send("history-update");
}, false);

$("playlist-div").addEventListener("mousewheel", function (e) {
  historyIndex += e.wheelDelta > 0 ? -1 : +1;
  background.send("history-update");
}, false);

function commonWords(title, wordlist) {
  title = title.toLowerCase();
  wordlist = wordlist.toLowerCase().split(/\s+/);
  return wordlist.every(
    function (itm) {return title.indexOf(itm)!= -1;}
  );
}

function search() {
  var count = 0;
  var text = $("input").value;
  var trs = $('items-table').getElementsByTagName('tr');
  [].forEach.call(trs, function(tr, index) {
    tr.getElementsByTagName("td")[2].textContent = '';
    tr.getElementsByTagName("td")[3].textContent = '';
    tr.getElementsByTagName("td")[2].style.backgroundPosition = '-' + BSB + 'px center';
    tr.setAttribute('state', '');
    tr.setAttribute('videoId', '');
    tr.setAttribute('duration', '');
  });
  for (var i = 0; i < YouTubeHistory.length; i++) {
    var title = YouTubeHistory[i][1];
    if (text.length > 0){
      if (commonWords(title, text) && count < trs.length) {
        trs[count].getElementsByTagName("td")[2].textContent = title;
        trs[count].setAttribute('videoId', YouTubeHistory[i][0]);
        count++;
      }
    }
  }
}

$("input").addEventListener("keyup", function (e) {
  var text = $("input").value;
  if (text.length == 0) {background.send('history-update');} else {search();}
}, false);

$("input").addEventListener("click", function (e) {
  $("input").select();
  $("input").focus();
}, false);

$("search-div").addEventListener("keydown", function (e) {
  if (e.keyCode === 13) {search();}
}, false);


$("search-td").addEventListener("click", function (e) {
  search();
}, false);

// Drag & Drop
function handleDrop(e) {
  var target = e.target || e.originalTarget;
  var startVideoId = e.dataTransfer.getData('text/plain');
  var endVideoId = target.parentNode.getAttribute('videoId');
  if (startVideoId && endVideoId && startVideoId != 'null' && endVideoId != 'null' &&  startVideoId != endVideoId) {
    var startId, endId, startTr, endTr;
    var rHistory = YouTubeHistory.reverse();
    for (var i = 0; i < rHistory.length; i++) {
      if (rHistory[i][0] == startVideoId) {
        startId = i;
        startTr = rHistory[i];
      }
      if (rHistory[i][0] == endVideoId) {
        endId = i;
        endTr = rHistory[i];
      }
    }
    if (startId < endId) {
      rHistory.splice(endId + 1, 0, startTr);
      rHistory.splice(startId, 1);
    }
    else {
      rHistory.splice(startId, 1);
      rHistory.splice(endId, 0, startTr);
    }
    background.send("drag-update", YouTubeHistory);
  }
}

$("items-table").addEventListener('dragstart', function (e) {
  var target = e.target || e.originalTarget;
  var tr = target.parentNode;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', tr.getAttribute('videoId'));
}, false);

$("items-table").addEventListener('dragenter', function (e) {
  var target = e.target || e.originalTarget;
  if (e.preventDefault) {e.preventDefault();}
}, false);

$("items-table").addEventListener('dragover', function (e) {
  var target = e.target || e.originalTarget;
  if (e.preventDefault) {e.preventDefault();}
  e.dataTransfer.dropEffect = 'move';
}, false);

$("items-table").addEventListener('dragleave', function (e) {
  var target = e.target || e.originalTarget;
}, false);

$("items-table").addEventListener('drop', function (e) {
  handleDrop(e);
  var target = e.target || e.originalTarget;
  if (e.stopPropagation) {e.stopPropagation();}
}, false);

$("items-table").addEventListener('dragend', function (e) {
  if (e.preventDefault) {e.preventDefault();}
}, false);

// Hover Listeners
var htmlElements = [
  $("previous-td"), $("play-td"), $("next-td"), $("stop-td"), $("loop-all-td"),
  $("volume-td"), $("options-td"), $("scroll-up-td"), $("scroll-down-td"), $("search-td")];

function AddListeners(E) {
  for (var i = 0; i < E.length; i++) {
    E[i].addEventListener("mouseenter", function (e) {
      var target = e.target || e.originalTarget;
      $("input").value = target.title;
    });
    E[i].addEventListener("mouseleave", function (e) {
      var target = e.target || e.originalTarget;
      $("input").value = globalStatus;
    });
  }
}

