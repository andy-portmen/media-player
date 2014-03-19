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
    init ();
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
    init ();
  });
}
/********/
var historyIndex;

function $ (id) {
  return document.getElementById(id);
}

function init () {
  background.send('history-update');
}

function setVolume(vol) {
  var td = $("volume-td");
  for (var i = 0; i < 10; i++) {
    if (i <= vol) {
      td.children[i].setAttribute('name', 'selected');
    } else {
      td.children[i].removeAttribute('name');
    }
  }
  background.send("popupVolumeIndex", vol);
}

var states, history;
background.receive('history-update', function (obj) {
  history = obj.history.reverse();
  states = obj.states;
  loops = obj.loops;
  setVolume(obj.volumeIndex);
  $("loop-all-td").setAttribute("loopIndex", obj.loopIndex);
  var isPlay = false;  // Play button
  for (id in states) {isPlay = isPlay || (states[id] == 1);}
  $("play-td").setAttribute('name', isPlay ? 'pause' : 'play');
  if (typeof historyIndex == 'undefined') {
    historyIndex =  obj.historyIndex;
  }
  var trs = $('items-table').getElementsByTagName('tr');
  // Making sure the historyIndex is working fine
  if (historyIndex < 0) {historyIndex = 0;}
  if (history.length <= trs.length) {historyIndex = 0;}
  else if ((historyIndex + trs.length > history.length - 1)) {
    historyIndex = history.length - trs.length;
  }
  [].forEach.call(trs, function(tr, index) { 
    var q = index + historyIndex;
    if (q < history.length) {
      var videoId = history[q][0];
      var title = history[q][1];
      var duration = history[q][2];
      duration = (new Date(1970,1,1,0,0,duration)).toTimeString().substr(0,8);  
      tr.getElementsByTagName("td")[1].textContent = title;
      /* 
        ended (0), 
        paused (2), 
        video cued (5) or 
        unstarted or stopped(-1)
      */
      switch (states[videoId]) {
      case 2:
        tr.setAttribute('state', 'pause');
        break;
      case 1:
        tr.setAttribute('state', 'play');
        break;
      default:
        tr.removeAttribute('state');
      }
      tr.getElementsByTagName('td')[3].setAttribute("loopIndex", loops[videoId]);
      tr.setAttribute('videoId', videoId);
      tr.setAttribute('duration', duration);      
    } else {
      tr.getElementsByTagName("td")[1].textContent = "";
      tr.setAttribute('state', '');
      tr.setAttribute('videoId', '');
      tr.setAttribute('duration', '');
    }
  }); 
  background.send('popupHistoryIndex', historyIndex);
});

// Listeners: addEventListener
$('play-td').addEventListener('click', function () {
  if ($('play-td').getAttribute('name') == 'play') {
    var isPause;
    for (id in states) {
      if (states[id] === 2) {
        isPause = id;
        break;
      }
    }
    if (isPause) {
      background.send("player-play", isPause);
    }
    else {
      if (history.length) {
        console.error(history[0][0])
        background.send("player-play", history[0][0]);
      }
      else {
        background.send("open-youtube");
      }
    }
  } 
  else {
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
    if (target.parentNode.getElementsByTagName('td')[2] == target) {
      background.send('delete-track', target.parentNode.getAttribute('videoId'));
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

$("items-table").addEventListener('click',function (e) {
  var target = e.originalTarget || e.target;
  if (target.localName === "td") {
    if (target.parentNode.getElementsByTagName('td')[0] == target) {
      if (target.getAttribute('name') == 'play-track') {
        target.setAttribute('name', 'pause-track');
      }
      else if (target.getAttribute('name') == 'pause-track') {
        target.setAttribute('name', 'play-track');
      }
    }
  }
}, false);

$("items-table").addEventListener('click',function (e) {
  var target = e.originalTarget || e.target;
  if (target.localName === "td") {
    if (target.parentNode.getElementsByTagName('td')[3] == target) {
      var index = parseInt(target.getAttribute("loopIndex")) || 0;
      index++;
      if (index > 6) index = 0;
      background.send("loop-track", {
        id: target.parentNode.getAttribute('videoId'),
        loopIndex: index
      });
    }
  }
}, false);