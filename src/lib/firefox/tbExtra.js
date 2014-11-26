var {Cu, components}        = require('chrome'),
    self       = require("sdk/self"),
    data       = self.data,
    timer      = require("sdk/timers"),
    base64     = require("sdk/base64"),
    unload     = require("sdk/system/unload"),
    userstyles = require("./userstyles"),
    config     = require("../config");

var id = ('action-button--' + self.id.toLowerCase()+ '-' + self.name).
  replace(/[^a-z0-9_-]/g, '');
var badge = 0, onContext;

Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource:///modules/CustomizableUI.jsm");

function loadStyles () {
  NetUtil.asyncFetch(data.url("./firefox/overlay.css"), function(inputStream, status) {
    if (!components.isSuccessCode(status)) {
      return;
    }
    var css = NetUtil.readInputStreamToString(inputStream, inputStream.available());
    css = css
      .replace(/__extra__/g, config.ui.extra) // need to be first
      .replace(/__id__/g, "#" + id)
      .replace(/__font_family__/g, config.ui.fontFamily)
      .replace(/__font_size__/g, config.ui.fontSize)
      .replace(/__height__/g, config.ui.height)
      .replace(/__line_height__/g, config.ui.lineHeight)
      .replace(/__margin_1__/g, config.ui.margin["1"])
      .replace(/__margin_2__/g, config.ui.margin["2"])
      .replace(/__margin_3__/g, config.ui.margin["3"])
      .replace(/__margin_4__/g, config.ui.margin["4"])
      .replace(/__width_1__/g, config.ui.width["1"])
      .replace(/__width_2__/g, config.ui.width["2"])
      .replace(/__width_3__/g, config.ui.width["3"])
      .replace(/__width_4__/g, config.ui.width["4"])
      .replace(/__bg_color__/g, config.ui.backgroundColor)
      .replace(/__color__/g, config.ui.color);

    userstyles.load("data:text/css;base64," + base64.encode(css));
  });
}
loadStyles();

function setBadge (value) {
  badge = value;
  var button = CustomizableUI.getWidget(id);
  if (!button) return;

  if ((value + "").length > 4) {
    value = "9999";
  }
  button.instances.forEach(function (i) {
    var tbb = i.anchor.ownerDocument.defaultView.document.getElementById(id);
    if (!tbb) return;
    tbb.setAttribute("value", value ? value : "");
    tbb.setAttribute("length", value ? (value + "").length : 0);
  });
}

var listen = {
  onWidgetBeforeDOMChange: function(tbb, aNextNode, aContainer, aIsRemoval) {
    if (tbb.id !== id) return;
    // Set badge
    if (badge) {
      timer.setTimeout(setBadge, 500, badge);
    }
  }
}
CustomizableUI.addListener(listen);
unload.when(function () {
  CustomizableUI.removeListener(listen);
  CustomizableUI.destroyWidget(id);
});

exports.setBadge = setBadge;
exports.onContext = function (c) {
  onContext = c;
};

exports.reset = function () {
  loadStyles();
}