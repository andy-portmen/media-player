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
  document.getElementById("clear-youtube-history").addEventListener("click", function () {
    background.send("clear-youtube-history");
  }, false);
}, false);

background.receive("youtube-history-table", function (obj) {
  var history = obj.history, playlist = obj.playlist;

  function addColumn(tr, txt) {
    var td = document.createElement("td");
    td.textContent = txt;
    td.dir = "auto";
    tr.appendChild(td);
  }
  function getTable(name) {
    var table = document.getElementById(name);
    var trs = table.getElementsByTagName('tr');
    for (var i = trs.length - 1; i > 0; i--) {
      table.removeChild(trs[i]); /* clear table */
    }
    return table;
  }
  function addColumn_a(tr, title, url, tag) {
    var td = document.createElement("td");
    var a = document.createElement('a');
    var txt = document.createTextNode(title);
    a.appendChild(txt);
    a.dir = "auto";
    a.title = unescape(title); 
    if (url) a.href = url;
    a.target = "_blank";
    a.style.color = '#797979';
    a.style.textDecoration = 'none';
    if (tag) a.style.fontWeight = 'bold';
    td.appendChild(a);
    tr.appendChild(td);
  }
  function addSeparator(table) {
    var tr = document.createElement("tr");
    addColumn(tr, '.....................');
    addColumn(tr, '...........................................................................................');
    addColumn(tr, '..............');
    table.appendChild(tr);
  }
  function addEmptyRow(table, title, count) {
    var tr = document.createElement("tr");
    addColumn(tr, title);
    addColumn_a(tr, "none", '', false);
    addColumn(tr, "none");
    if (count == 4) addColumn(tr, "unknown");
    table.appendChild(tr);
  }
  
  /* PlayList Titles */
  var table = getTable("youtube-playlist-table");
  if (playlist.length) {
    for (var i = 0; i < playlist.length; i++) {
      var videos = playlist[i].videos;
      var tr = document.createElement("tr");
      addColumn(tr, playlist[i].title);
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
      addColumn(tr, playlist[i].videos.length);
      addColumn(tr, playlist[i].account);
      table.appendChild(tr);
    }
  }
  else addEmptyRow(table, "unknown", 4);
  
  /* Media Player PlayList */
  var table = getTable("youtube-history-table");
  if (history.length) {
    for (var i = 0; i < history.length; i++) {
      var tr = document.createElement("tr");
      var title = history[i][1];
      var url = 'https://www.youtube.com/watch?v=' + history[i][0];
      var duration = (new Date(1970,1,1,0,0,history[i][2])).toTimeString().substr(0,8);
      addColumn(tr, "Media Player");
      addColumn_a(tr, title, url, history[i][3] == 'added');
      addColumn(tr, duration);
      table.appendChild(tr);
    }
  }
  else addEmptyRow(table, "Media Player", 3);
  addSeparator(table); /* separator */
  
  /* YouTube PlayList */
  for (var i = 0; i < playlist.length; i++) {
    var videos = playlist[i].videos;
    if (videos.length) {
      for (var j = 0; j < videos.length; j++) {
        var tr = document.createElement("tr");
        var title = videos[j].title;
        var url = 'https://www.youtube.com/watch?v=' + videos[j].id;
        var duration = (new Date(1970,1,1,0,0,videos[j].duration)).toTimeString().substr(0,8);
        addColumn(tr, playlist[i].title);
        addColumn_a(tr, title, url, videos[j].addToFavorite == 'added');
        addColumn(tr, duration);
        table.appendChild(tr);
      }
    }
    else addEmptyRow(table, playlist[i].title, 3);
    addSeparator(table); /* separator */
  }
});