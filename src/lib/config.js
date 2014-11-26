/**** wrapper (start) ****/
var isFirefox = typeof require !== 'undefined';
if (isFirefox) {
  var storage = require('./firefox/firefox').storage;
  var os = require("sdk/system").platform;
  config = exports;
}
else {
  var config = {};
}
/**** wrapper (end) ****/

config.welcome = {
  get version () {
    return storage.read("version");
  },
  set version (val) {
    storage.write("version", val);
  },
  timeout: 3
}

config.popup = {
  get color () {
    return storage.read("popup-color") || "#AAAAAA";
  },
  set color (val) {
    storage.write("popup-color", val);
  }
}

config.youtube = {
  get history () {
    return JSON.parse(storage.read("history") || "[]");
  },
  set history (val) {
    storage.write("history", JSON.stringify(val));
  },
  get trackQualityLevel () {
    return JSON.parse(storage.read("trackQualityLevel") || "{}");
  },
  set trackQualityLevel (val) {
    storage.write("trackQualityLevel", JSON.stringify(val));
  },
  get popupHistoryIndex () {
    return parseInt(storage.read("popupHistoryIndex") || "0");
  },
  set popupHistoryIndex (val) {
    storage.write("popupHistoryIndex", val + '');
  },
  get popupVolumeIndex () {
    return parseInt(storage.read("popupVolumeIndex") || "5");
  },
  set popupVolumeIndex (val) {
    storage.write("popupVolumeIndex", val + '');
  },
  get loopAll () {
    return parseInt(storage.read("loop-all") || "0");
  },
  set loopAll (val) {
    storage.write("loop-all", val + '');
  },
  get numberHistoryItems () {
    return parseInt(storage.read("numberHistoryItems") || "20");
  },
  set numberHistoryItems (val) {
    storage.write("numberHistoryItems", val + '');
  }
}

/* Firefox UI */
config.ui = {
  badge: true,
  get fontFamily () {
    if (os === "darwin") return "sans-serif";
    if (os === "linux") return "\"Liberation Sans\", FreeSans, Arial, Sans-serif";
    return "Arial";
  },
  get fontSize () {
    if (os === "darwin") return "8px";
    return "10px";
  },
  get height () {
    if (os === "darwin") return "10px";
    return "11px";
  },
  get lineHeight () {
    return "11px";
  },
  get backgroundColor () {
    return "#FF0000";
  },
  get color () {
    return "#FFFFFF";
  },
  margin: {
    get "1" () {  // badge length of "1"
      if (os === "darwin") return "-10px -13px 0 0";
      if (os === "linux") return "7px 3px 0 -13px";
      return "7px 3px 0 -13px";
    },
    get "2" () {
      if (os === "darwin") return "-10px -14px 0 0";
      if (os === "linux") return "7px 3px 0 -19px";
      return "7px 3px 0 -19px";
    },
    get "3" () {
      if (os === "darwin") return "-10px -14px 0 -7px";
      if (os === "linux") return "7px 4px 0 -26px";
      return "7px 3px 0 -23px";
    },
    get "4" () {
      if (os === "darwin") return "-10px -14px 0 -13px";
      if (os === "linux") return "7px 2px 0 -30px";
      return "7px 3px 0 -27px";
    }
  },
  width: {
    get "1" () { // badge width of "1"
      return "10px";
    },
    get "2" () {
      if (os === "darwin") return "12px";
      return "16px";
    },
    get "3" () {
      if (os === "darwin") return "19px";
      return "20px";
    },
    get "4" () {
      if (os === "darwin") return "21px";
      return "22px";
    }
  },
  get extra ()  {
    if (os === "darwin") {
      return "__id__:moz-window-inactive:after {background-color: #99B2E5}";
    }
    if (os === "linux") {
      return "__id__:after {padding-top: 1px; letter-spacing: -0.05ex;}";
    }
    return "";
  }
}

/* Complex get() and set() */
config.get = function (name) {
  return name.split(".").reduce(function(p, c) {
    return p[c]
  }, config);
}
config.set = function (name, value) {
  function set(name, value, scope) {
    name = name.split(".");
    if (name.length > 1) {
      set.call((scope || this)[name.shift()], name.join("."), value)
    }
    else {
      this[name[0]] = value;
    }
  }
  set(name, value, config);
}