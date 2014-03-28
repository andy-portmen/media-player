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
var timeout = null;
var player_available = false;
var oldTitle;

function DOMlistener_Timeout() {
  if (timeout) {clearTimeout(timeout);}
  timeout = setTimeout(DOMlistener, 500);
}

function DOMlistener() {
  if (player_available) {return;}
  var totalTime = (document.querySelector(".ytp-time-duration") || {textContent: ""}).textContent;
  var title = ((window.content.document || document).getElementsByClassName("watch-title") || [{title: ''}])[0].title;
  console.error(0, oldTitle, title)
  var p = document.getElementById('movie_player') || document.getElementById('movie_player-flash');
  if (p && p.getDuration) {totalTime = p.getDuration() + "";}
  if (totalTime.length > 0 && title && title != oldTitle) {
    player_available = true;
    oldTitle = title;
  }
  var player_id = (/v\=([^\&]*)/.exec(window.location.href) || [null,null])[1];
  var referer_id = (/v\=([^\&]*)/.exec(window.history.state["spf-referer"])|| [null,null])[1];
  if (player_available && (player_id != referer_id)) {
    background.send('time_to_run', tabId);
    document.removeEventListener("DOMSubtreeModified", DOMlistener_Timeout, false);
  }
}

document.addEventListener("DOMSubtreeModified", DOMlistener_Timeout, false);
