var self          = require("sdk/self"),
    data          = self.data,
    sp            = require("sdk/simple-prefs"),
    buttons       = require("sdk/ui/button/action"),
    Request       = require("sdk/request").Request,
    prefs         = sp.prefs,
    pageMod       = require("sdk/page-mod"),
    pageWorker    = require("sdk/page-worker"),
    timers        = require("sdk/timers"),
    loader        = require('@loader/options'),
    tabs          = require("sdk/tabs"),
    windowUtils   = require('sdk/window/utils'),
    contextMenu   = require("sdk/context-menu"),
    array         = require('sdk/util/array'),
    unload        = require("sdk/system/unload"),
    {Cc, Ci, Cu}  = require('chrome'),
    windows       = {
      get active () { /* Chrome window */
        return windowUtils.getMostRecentBrowserWindow()
      }
    },
    tbExtra       = require("./tbExtra"),
    config        = require("../config");

Cu.import("resource://gre/modules/Promise.jsm");

var button = buttons.ActionButton({
  id: "iyplayer",
  label: "Media Player for YouTube™",
  icon: {
    "16": "./icon16.png",
    "32": "./icon32.png",
    "64": "./icon64.png"
  },
  onClick: function (state) {
    popup.show({
      position: button
    });
  }
});

exports.icon = function (state) {
  if (state == 'pause' || state == 'stop' || state == 'play') {
    button.icon = {"16" : "./icon16" + state + ".png"};
  }
  else {
    button.icon = {"16" : "./icon16.png"};
  }
}

var workers = [], content_script_arr = [];
pageMod.PageMod({
  include: ["*.youtube.com"],
  contentScriptFile: data.url("./content_script/firefox_inject.js"),
  contentScriptWhen: "end",
  onAttach: function(worker) {
    array.add(workers, worker);
    worker.on('pageshow', function() { array.add(workers, this); });
    worker.on('pagehide', function() { array.remove(workers, this); });
    worker.on('detach', function() { array.remove(workers, this); });
    content_script_arr.forEach(function (arr) {
      worker.port.on(arr[0], arr[1]);
    });
  }
});

var popup = require("sdk/panel").Panel({
  width: 500,
  height: 222,
  contentURL: data.url("./popup/popup.html"),
  contentScriptFile: [data.url("./popup/popup.js"), data.url("./popup/css_browser_selector.js")]
});
popup.on('show', function() {
  popup.port.emit('show', true);
});
popup.port.on("resize", function(obj) {
  popup.resize(obj.w + 10, obj.h + 5);
});

exports.popup = {
  send: function (id, data) {
    popup.port.emit(id, data);
  },
  receive: function (id, callback) {
    popup.port.on(id, callback);
  }
}

exports.storage = {
  read: function (id) {
    return (prefs[id] || prefs[id] + "" == "false") ? (prefs[id] + "") : null;
  },
  write: function (id, data) {
    data = data + "";
    if (data === "true" || data === "false") {
      prefs[id] = data === "true" ? true : false;
    }
    else if (parseInt(data) === data) {
      prefs[id] = parseInt(data);
    }
    else {
      prefs[id] = data + "";
    }
  }
}

exports.get = function (url, headers, data) {
  var d = new Promise.defer();
  Request({
    url: url,
    headers: headers || {},
    content: data,
    onComplete: function (response) {
      if (response.status >= 400 || response.status < 200) {
        var e = new Error(response.status);
        e.status = response.status;
        d.reject(e);
      }
      else {
        d.resolve(response.text);
      }
    }
  })[data ? "post" : "get"]();
  return d.promise;
}

exports.content_script = {
  send: function (id, data, global) {
    workers.forEach(function (worker) {
      if (!global && worker.tab != tabs.activeTab) return;
      if (!worker) return;
      worker.port.emit(id, data);
    });
  },
  receive: function (id, callback) {
    content_script_arr.push([id, callback]);
  }
}

exports.tab = {
  open: function (url, inBackground, inCurrent) {
    if (inCurrent) {
      tabs.activeTab.url = url;
    }
    else {
      tabs.open({
        url: url,
        inBackground: typeof inBackground == 'undefined' ? false : inBackground
      });
    }
  },
  openOptions: function () {
    var optionsTab = false;
    for each (var tab in tabs) {
      if (tab.url.indexOf("dgnicqqgv2auzw-at-jetpack/iyplayer") != -1) {
        tab.reload();            // reload the options tab
        tab.activate();          // activate the options tab
        tab.window.activate();   // activate the options tab window
        optionsTab = true;
      }
    }
    if (!optionsTab) tabs.open(data.url("options/options.html"));
  }
}

exports.options = (function () {
  var workers = [], options_arr = [];
  pageMod.PageMod({
    include: data.url("options/options.html"),
    contentScriptFile: [data.url("options/options.js"), data.url("options/colorpicker/mcColorPicker.js")],
    contentStyleFile: [data.url("options/colorpicker/mcColorPicker.css")],
    contentScriptWhen: "start",
    contentScriptOptions: {
      base: loader.prefixURI + loader.name + "/"
    },
    onAttach: function(worker) {
      array.add(workers, worker);
      worker.on('pageshow', (w) => array.add(workers, w));
      worker.on('pagehide', (w) => array.remove(workers, w));
      worker.on('detach', (w) => array.remove(workers, w));

      options_arr.forEach(function (arr) {
        worker.port.on(arr[0], arr[1]);
      });
    }
  });
  return {
    send: function (id, data) {
      workers.forEach(function (worker) {
        if (!worker || !worker.url) return;
        worker.port.emit(id, data);
      });
    },
    receive: (id, callback) => options_arr.push([id, callback])
  }
})();

sp.on("openOptions", function() {
  exports.tab.open(data.url("options/options.html"));
});
unload.when(function () {
  exports.tab.list().then(function (tabs) {
    tabs.forEach(function (tab) {
      if (tab.url === data.url("options/options.html")) {
        tab.close();
      }
    });
  });
});

exports.version = function () {
  return self.version;
}

exports.timer = timers;
exports.Promise = Promise;
exports.parser = Cc["@mozilla.org/xmlextras/domparser;1"].createInstance(Ci.nsIDOMParser);
exports.manifest = "resource://jid1-dgnICqQgv2AUZw-at-jetpack/iyplayer/";
exports.window = windowUtils.getMostRecentBrowserWindow();
exports.Deferred = Promise.defer;