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

var oldTitle, timeout = null, isHTML5;

function DOMlistener_Timeout() {
  if (timeout) {clearTimeout(timeout);} 
  timeout = setTimeout(DOMlistener, 500);
}
function DOMlistener() {
  var totalTime = (document.querySelector(".ytp-time-duration") || {textContent: ""}).textContent;
  isHTML5 = totalTime ? true : false;
  var p = document.getElementById('movie_player') || document.getElementById('movie_player-flash');
  if (p && p.getDuration) {totalTime = p.getDuration() + "";}
  var watch_title = (window.content.document || document).getElementsByClassName("watch-title");
  if (watch_title[0] == 'undefined' || !watch_title || !watch_title[0]) {watch_title = [{title: ''}];};
  var title = watch_title[0].title;
  var player_id = (/v\=([^\&]*)/.exec(window.location.href) || [null,null])[1];
  var referer_id = (/v\=([^\&]*)/.exec(window.history.state["spf-referer"]) || [null,null])[1];
  // Check (totalTime + title + player_id + referer_id) to see if player is available, then run init()
  if (totalTime.length > 0 && title && (title != oldTitle) && (player_id != referer_id)) {
    init(); // run init() in (inject.js) file
    oldTitle = title;
    document.removeEventListener("DOMSubtreeModified", DOMlistener_Timeout, false);
  }
}
document.addEventListener("DOMSubtreeModified", DOMlistener_Timeout, false);
