var _safari = {
  Promise: Q.promise,
  parser: new window.DOMParser(),

  storage: {
    read: function (id) {
      return localStorage[id] || null;
    },
    write: function (id, data) {
      localStorage[id] = data + "";
    }
  },

  popup: (function () {
    var callbacks = {};
    return {
      send: function (id, obj) {
        safari.extension.popovers[0].contentWindow.background.dispatchMessage(id, obj)
      },
      receive: function (id, callback) {
        callbacks[id] = callback;
      },
      dispatchMessage: function (id, obj) {
        if (callbacks[id]) {
          callbacks[id](obj);
        }
      }
    }
  })(),

  tab: {
    open: function (url, inBackground, inCurrent) {
      if (inCurrent) {
        safari.application.activeBrowserWindow.activeTab.url = url;
      }
      else {
        safari.application.activeBrowserWindow.openTab(inBackground ? "background" : "foreground").url = url;
      }
    },
    openOptions: function () {
      var optionsTab = false;
      var tabs = safari.application.activeBrowserWindow.tabs;
      for (var i = 0; i < tabs.length; i++) {
        var tab = tabs[i];
          if (tab.url && tab.url.indexOf("data/options/options.html") != -1) {
            tab.activate();
            optionsTab = true;
            break;
          }
      }
      if (!optionsTab) safari.application.activeBrowserWindow.openTab().url = safari.extension.baseURI + "data/options/options.html";
    }
  },

  version: function () {
    return safari.extension.displayVersion;
  },

  get: function (url, headers, data) {
    var xhr = new XMLHttpRequest();
    var deferred = new Q.defer();
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status >= 400) {
          var e = new Error(xhr.statusText);
          e.status = xhr.status;
          deferred.reject(e);
        }
        else {
          deferred.resolve(xhr.responseText);
        }
      }
    };
    xhr.open(data ? "POST" : "GET", url, true);
    for (var id in headers) {
      xhr.setRequestHeader(id, headers[id]);
    }
    if (data) {
      var arr = [];
      for(e in data) {
        arr.push(e + "=" + data[e]);
      }
      data = arr.join("&");
    }
    xhr.send(data ? data : "");
    return deferred.promise;
  },

  content_script: (function () {
    var callbacks = {};
    safari.application.addEventListener("message", function (e) {
      if (callbacks[e.message.id]) {
        callbacks[e.message.id](e.message.data);
      }
    }, false);
    return {
      send: function (id, data, global) {
        if (global) {
          safari.application.browserWindows.forEach(function (browserWindow) {
            browserWindow.tabs.forEach(function (tab) {
              if (tab.page) {
                tab.page.dispatchMessage(id, data);
              }
            });
          });
        }
        else {
          safari.application.activeBrowserWindow.activeTab.page.dispatchMessage(id, data);
        }
      },
      receive: function (id, callback) {
        callbacks[id] = callback;
      }
    }
  })(),

  manifest: {
    url: safari.extension.baseURI
  },

  icon: function (state) {
    var toolbarItem = safari.extension.toolbarItems[0];
    if (state == 'pause' || state == 'stop' || state == 'play') {
      toolbarItem.image = safari.extension.baseURI + "data/icon16" + state + ".png";
    }
    else {
      toolbarItem.image = safari.extension.baseURI + "data/icon16-mac.png";
    }
  },

  options: (function () {
    var callbacks = {};
    safari.application.addEventListener("message", function (e) {
      if (callbacks[e.message.id]) {
        callbacks[e.message.id](e.message.data);
      }
    }, false);
    return {
      send: function (id, data) {
        safari.application.browserWindows.forEach(function (browserWindow) {
          browserWindow.tabs.forEach(function (tab) {
            if (tab.page) tab.page.dispatchMessage(id, data);
          });
        });
      },
      receive: function (id, callback) {
        callbacks[id] = callback;
      }
    }
  })()
}
