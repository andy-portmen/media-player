/********/
var background = {};
if (typeof chrome !== 'undefined') {
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
else {
  background.send = function (id, data) {
    self.port.emit(id, data);
  }
  background.receive = function (id, callback) {
    self.port.on(id, callback);
  }
  self.port.on("show", function () {
    init();
  });
}
/********/
var states, currentTimes, history, historyIndex, timeout = null;

function $ (id) {
  return document.getElementById(id);
}

function init () {
  background.send('history-update');
}

runTimeOut();
function runTimeOut() {
  if (timeout) {clearTimeout(timeout);} 
  timeout = window.setTimeout(getCurrentTime, 1000);
}

function getCurrentTime() {
  background.send('iplayer-currentTime');
  runTimeOut();
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
      
background.receive('iplayer-currentTime-common', function (currentTimes) {
  var trs = $('items-table').getElementsByTagName('tr');
  [].forEach.call(trs, function(tr, index) { 
    if (tr.getAttribute('state') == 'play') {
      var tr_duration = parseInt(tr.getAttribute('duration'));
      var tr_videoId = tr.getAttribute('videoId');
      var currentTime = currentTimes[tr_videoId];  
      var X = Math.round((currentTime / tr_duration) * 234) - 234;
      tr.getElementsByTagName("td")[1].setAttribute('X', X);
      tr.getElementsByTagName("td")[1].setAttribute('currentTime', currentTime);
      tr.getElementsByTagName("td")[1].style.backgroundPosition = X.toString() + 'px center';    
      tr.getElementsByTagName("td")[2].textContent = secondsToHms(currentTime) + ' / ' + secondsToHms(tr_duration);
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
  history = obj.history.reverse();
  states = obj.states;
  currentTimes = obj.currentTimes;
  loops = obj.loops;
  setVolume(obj.volumeIndex);
  $("loop-all-td").setAttribute("loopIndex", obj.loopIndex);
  var isPlay = false;  // Play button
  for (id in states) {isPlay = isPlay || (states[id] == 1);}
  $("play-td").setAttribute('name', isPlay ? 'pause' : 'play');
  if (typeof historyIndex == 'undefined') {historyIndex =  obj.historyIndex;}
  var trs = $('items-table').getElementsByTagName('tr');
  // Making sure the historyIndex is working fine
  if (historyIndex < 0) {historyIndex = 0;}
  if (history.length <= trs.length) {historyIndex = 0;}
  else if ((historyIndex + trs.length > history.length - 1)) {
    historyIndex = history.length - trs.length;
  }
  $("input").value = '';
  [].forEach.call(trs, function(tr, index) { 
    var q = index + historyIndex;
    if (q < history.length) {
      var videoId = history[q][0];
      var title = history[q][1];
      var duration = history[q][2];
      tr.getElementsByTagName("td")[1].textContent = title;
      var currentTime = currentTimes[videoId] || 0;
      tr.getElementsByTagName("td")[2].textContent = secondsToHms(currentTime) + ' / ' + secondsToHms(parseInt(duration));
      var X = Math.round((currentTime / duration) * 234) - 234;
      tr.getElementsByTagName("td")[1].style.backgroundPosition = X.toString() + 'px center';
        
      /* play (1), ended (0), paused (2), loading (3), video cued /stop (5) or unstarted (-1)*/
      switch (states[videoId]) {
      case 0: // Ended
        tr.setAttribute('state', 'end');
        break;
      case 1: // Play
        tr.setAttribute('state', 'play');
        $("input").value = title;
        $("input").style.opacity = 0.5;
        break;
      case 2: // Pause
        tr.setAttribute('state', 'pause');
        break;
      case 3: // Loading
        tr.setAttribute('state', 'loading');
        break;
      case 5: // Video Stopped
        tr.setAttribute('state', 'stop');
        tr.getElementsByTagName("td")[1].style.backgroundPosition = '-234px center';
        tr.getElementsByTagName("td")[2].textContent = secondsToHms(0) + ' / ' + secondsToHms(parseInt(duration));
        break;      
      default: // Closed
        tr.getElementsByTagName("td")[1].style.backgroundPosition = '-234px center';
        tr.removeAttribute('state');
      }
      tr.getElementsByTagName('td')[4].setAttribute("loopIndex", loops[videoId]);
      tr.setAttribute('videoId', videoId);
      tr.setAttribute('duration', duration);      
    } else {
      tr.getElementsByTagName("td")[1].style.backgroundPosition = '-234px center';
      tr.getElementsByTagName("td")[1].textContent = "";
      tr.getElementsByTagName("td")[2].textContent = "";
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
    } else {
      if (history.length) {background.send("player-play", history[0][0]);}
      else {background.send("open-youtube");}
    }
  } else {
    background.send("player-pause", "all");
  }
}, false);

$('next-td').addEventListener('click', function () {
  for (var i = 0; i < history.length - 1; i++) {
    if (states[history[i][0]] == 1 || states[history[i][0]] == 2) {
      background.send("player-new-id", {
        id: history[i][0],
        newID: history[i+1][0]
      });
      break;
    }
  }
}, false);

$('previous-td').addEventListener('click', function () {
  for (var i = 1; i < history.length; i++) {
    if (states[history[i][0]] == 1 || states[history[i][0]] == 2) {
      background.send("player-new-id", {
        id: history[i][0],
        newID: history[i-1][0]
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

$("items-table").addEventListener('click',function (e) {
  var target = e.originalTarget || e.target;
  if (target.localName === "td") {
    var tr = target.parentNode;
    if (tr.getElementsByTagName('td')[3] == target) {
      background.send('delete-track', tr.getAttribute('videoId'));
    }
    else if (tr.getElementsByTagName('td')[4] == target) {
      var index = parseInt(target.getAttribute("loopIndex")) || 0;
      index++;
      if (index > 6) index = 0;
      background.send("loop-track", {
        id: tr.getAttribute('videoId'),
        loopIndex: index
      });
    }
    else if (tr.getElementsByTagName('td')[1] == target) {
      if (tr.getAttribute('state') == 'play') {
        var videoId = tr.getAttribute('videoId');
        var duration = parseInt(tr.getAttribute('duration'));
        var second = Math.round(((e.clientX - 27) / 234) * duration); // 27 --- 256
        var X = (e.clientX - 27) - 234;
        tr.getElementsByTagName("td")[1].style.backgroundImage = 'url(td-background.png)';
        tr.getElementsByTagName("td")[1].style.backgroundRepeat = 'no-repeat';
        tr.getElementsByTagName("td")[1].style.backgroundPosition = X.toString() + 'px center'; 
        background.send('player-seek', {
          second: second,
          videoId: videoId
        });
      }
    } else {
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
    tr.getElementsByTagName("td")[1].textContent = '';
    tr.getElementsByTagName("td")[2].textContent = '';
    tr.getElementsByTagName("td")[1].style.backgroundPosition = '-234px center'; 
    tr.setAttribute('state', '');
    tr.setAttribute('videoId', '');
    tr.setAttribute('duration', '');
  });
  for (var i = 0; i < history.length; i++) {
    var title = history[i][1];
    if (text.length > 0){
      if (commonWords(title, text) && count < trs.length) {
        trs[count].getElementsByTagName("td")[1].textContent = title;
        trs[count].setAttribute('videoId', history[i][0]);
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
