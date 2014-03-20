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
function $(id) {
  $.cache = $.cache || [];
  $.cache[id] = $.cache[id] || (window.content.document || document).getElementById(id);
  return $.cache[id];
}

console.error('initial is running');

var timeout = null;
var time_to_run = false;

function listener() {
  var player = $('movie_player') || $('movie_player-flash') || {};
  player = (typeof XPCNativeWrapper != "undefined") ? XPCNativeWrapper.unwrap (player) : player;
  var player_id = /v\=([^\&]*)/.exec(player.getVideoUrl() || [null,null])[1];

  var referer = window.history.state["spf-referer"];
  var referer_id = (/v\=([^\&]*)/.exec(referer)|| [null,null])[1];
  
  if (player_id != referer_id && !time_to_run) {
    console.error('time to run');
    time_to_run = true;
    background.send('time_to_run', tabId);
  }
}
document.addEventListener("DOMSubtreeModified", function () {
  if (timeout) {clearTimeout(timeout);}
  timeout = setTimeout(listener, 500);
}, false);
