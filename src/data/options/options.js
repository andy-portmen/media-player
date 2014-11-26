var background = {}, manifest = {},
  isSafari = typeof safari !== 'undefined',
  isFirefox = typeof self !== 'undefined' && self.port,
  isOpera = typeof chrome !== 'undefined' && navigator.userAgent.indexOf("OPR") !== -1,
  isChrome = typeof chrome !== 'undefined' && navigator.userAgent.indexOf("OPR") === -1;

/**** wrapper (start) ****/
if (isChrome || isOpera) {
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
  manifest.base = chrome.extension.getURL('');
}
if (isSafari) {
  background.send = function (id, obj) {
    safari.self.tab.dispatchMessage("message", {
      id: id,
      data: obj
    });
  }
  background.receive = (function () {
    var callbacks = {};
    safari.self.addEventListener("message", function (e) {
      if (callbacks[e.name]) {
        callbacks[e.name](e.message);
      }
    }, false);

    return function (id, callback) {
      callbacks[id] = callback;
    }
  })();
  manifest.url = safari.extension.baseURI;
}
if (isFirefox) {
  background.send = self.port.emit;
  background.receive = self.port.on;
  manifest.base = self.options.base;
  background.receive("show", function () {
    background.send("show");
  });
}
/**** wrapper (end) ****/

var connect = function (elem, pref) {
  var att = "value";
  if (elem) {
    if (elem.type == "checkbox") {
      att = "checked";
    }
    if (elem.localName == "select") {
      att = "selectedIndex";
    }
    if (elem.localName == "span") {
      att = "textContent";
    }
    var pref = elem.getAttribute("data-pref");
    background.send("get", pref);
    elem.addEventListener("change", function () {
      background.send("changed", {
        pref: pref,
        value: this[att]
      });
    });
  }
  return {
    get value () {
      return elem[att];
    },
    set value (val) {
      if (elem.type === "file") return;
      elem[att] = val;
    }
  }
}

background.receive("set", function (o) {
  if (window[o.pref]) {
    window[o.pref].value = o.value;
  }
});

function pickColor(type) {
  function handle() {
    background.send("changed", {
      pref: type,
      value: document.getElementById('hexBox').textContent
    });
    colorContainer.removeEventListener('click', handle);
  }
  var colorContainer = document.getElementById('colorContainer');
  colorContainer.addEventListener('click', handle);
}

window.addEventListener("load", function () {
  var prefs = document.querySelectorAll("*[data-pref]");
  [].forEach.call(prefs, function (elem) {
    var pref = elem.getAttribute("data-pref");
    window[pref] = connect(elem, pref);
  });
  window.setTimeout(function () {
    var colorPicker = document.querySelector('span[class="colorChooser"]');
    /* set colorPicker */
    colorPicker.style.backgroundColor = window["popup.color"].value;
    colorPicker.addEventListener('click', function () {pickColor("popup.color")});
  }, 200);
  background.send("youtube-history-table");
}, false);

background.receive("youtube-history-table", function (obj) {
  function addColumn(tr, txt, parent) {
    var table = document.getElementById(parent);
    var td = document.createElement("td");
    td.textContent = txt;
    td.dir = "auto";
    tr.appendChild(td);
    table.appendChild(tr);
  }
  function clearTable(parent) {
    var table = document.getElementById(parent);
    var trs = table.getElementsByTagName('tr');
    for (var i = trs.length - 1; i > 0; i--) {
      table.removeChild(trs[i]); /* clear table */
    }
  }
  var parent = "";
  var history = obj.history;
  var playlist = obj.playlist;
  
  /* PlayList Titles */
  parent = "youtube-playlist-table";
  clearTable(parent);
  for (var i = 0; i < playlist.length; i++) {
    var videos = playlist[i].videos;
    var tr = document.createElement("tr");
    addColumn(tr, playlist[i].title, parent);
    var td = document.createElement("td");
    var checkbox = document.createElement('input');
    checkbox.type = "checkbox";
    checkbox.name = playlist[i].title.toLowerCase();
    if (playlist[i].include == 'true') {
      checkbox.checked = true;
      /* update video-list if the check-box is checked */
      background.send("add-youtube-playlist", checkbox.name);
    }
    checkbox.addEventListener("change", function (e) {
      if (e.target.checked) {
        background.send("add-youtube-playlist", e.target.getAttribute("name"));
      }
      else {
        background.send("remove-youtube-playlist", e.target.getAttribute("name"));
      }
    });
    td.appendChild(checkbox);
    tr.appendChild(td);
    addColumn(tr, playlist[i].videos.length, parent);
    addColumn(tr, playlist[i].account, parent);
  }
  
  /* Media Player PlayList */
  parent = "youtube-history-table";
  clearTable(parent);
  for (var i = 0; i < history.length; i++) {
    var tr = document.createElement("tr");
    var title = history[i][1];
    var url = 'https://www.youtube.com/watch?v=' + history[i][0];
    var duration = (new Date(1970,1,1,0,0,history[i][2])).toTimeString().substr(0,8);
    addColumn(tr, "Media Player", parent);
    var a = document.createElement('a');
    a.appendChild(document.createTextNode(title));
    a.dir = "auto";
    a.title = unescape(title); 
    a.href = url;
    a.target = "_blank";
    a.style.textDecoration = 'none';
    a.style.color = '#797979';
    if (history[i][3] == 'added') a.style.fontWeight = 'bold';
    tr.appendChild(a);
    addColumn(tr, duration, parent);
  }
  
  /* YouTube PlayList */
  parent = "youtube-history-table";
  for (var i = 0; i < playlist.length; i++) {
    var videos = playlist[i].videos;
    for (var j = 0; j < videos.length; j++) {
      var tr = document.createElement("tr");
      var title = videos[j].title;
      var url = 'https://www.youtube.com/watch?v=' + videos[j].id;
      var duration = (new Date(1970,1,1,0,0,videos[j].duration)).toTimeString().substr(0,8);
      addColumn(tr, playlist[i].title, parent);
      var a = document.createElement('a');
      a.appendChild(document.createTextNode(title));
      a.dir = "auto";
      a.title = unescape(title); 
      a.href = url;
      a.target = "_blank";
      a.style.textDecoration = 'none';
      a.style.color = '#797979';
      if (videos[j].addToFavorite == 'added') a.style.fontWeight = 'bold';
      tr.appendChild(a);
      addColumn(tr, duration, parent);
    }
    /* separator */
    var tr = document.createElement("tr");
    addColumn(tr, '.....................', parent);
    addColumn(tr, '...........................................................................................', parent);
    addColumn(tr, '..............', parent);
  }
});