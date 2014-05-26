var storage = chrome.extension.getBackgroundPage().storage;
var readHistory = chrome.extension.getBackgroundPage().readHistory;
var clearStorageHistory = chrome.extension.getBackgroundPage().clearHistory;
// ------------------------------------------------------------------

function $ (id) {
  return document.getElementById(id);
};

function loadOptions() {
  clearOptionsHistoryList();
  document.getElementById('numberHistoryItems').value = storage.read('numberHistoryItems');
  readHistory().forEach(function (o, i) {
    if (i < parseInt(storage.read('numberHistoryItems'))) {
      var historyList = document.getElementById('historyList');
      var span1 = document.createElement('span');
      var span2 = document.createElement('span');
      var a = document.createElement('a');
      var br = document.createElement('br');   
      var url = 'https://www.youtube.com/watch?v=' + o[0];
      var title = o[1];
      var duration = (new Date(1970,1,1,0,0,o[2])).toTimeString().substr(0,8);  
      span1.textContent = ' (' + (i + 1) + ') ';
      span2.textContent = ' (' + duration + ')';
      a.appendChild(document.createTextNode(title));
      a.dir = "auto";
      a.title = title; 
      a.href = url;
      a.style.textDecoration = 'none';
      a.style.color = '#797979';
      if (o[3] == 'added') a.style.fontWeight = 'bold';
      historyList.appendChild(span1);
      historyList.appendChild(a);
      historyList.appendChild(span2);
      historyList.appendChild(br);
    }
  });
}
function clearOptionsHistoryList() {
  var historyList = document.getElementById('historyList');
  while (historyList.firstChild) {historyList.removeChild(historyList.firstChild);}
  document.getElementById('numberHistoryItems').value = 0;
}
function clearOptionsHistory() {
  clearStorageHistory();
  clearOptionsHistoryList();
}

// Option Listeners
document.getElementById('saveAsHistory').addEventListener('click', function () {
  var data = 'sep=; \n';
  readHistory().forEach(function (o, i) {
    if (i < parseInt(storage.read('numberHistoryItems'))) {
      var url = 'https://www.youtube.com/watch?v=' + o[0];
      var title = o[1];
      var duration = (new Date(1970,1,1,0,0,o[2])).toTimeString().substr(0,8);  
      data += (i + 1) + '; ' + title + '; ' + url + ';' + duration + '\n';
    }
  });
  var encodedUri = encodeURI(data);
  var link = document.createElement('a');
  link.setAttribute('href', 'data:text/csv;charset=utf-8,\uFEFF' + encodedUri);
  link.setAttribute('download','YouTube-History.csv');
  link.click();
}, false);
document.getElementById('clearHistory').addEventListener('click', function () {
  clearOptionsHistory();
  loadOptions();
}, false);
document.getElementById('numberHistoryItems').addEventListener('change', function (e) {
  storage.write('numberHistoryItems', e.target.value);
  loadOptions();
}, false);

window.onload = function() {
  loadOptions();
  $('Settings_Tabs_Interface').setAttribute('active', 'true');
  $('Settings_Tabs_Interface').addEventListener('click', function() {
    $('Settings_Tabs_Interface').setAttribute('active', 'true');
    $('Settings_Tabs_General').removeAttribute('active');
    $('tc-1').style.display = 'block';
    $('tc-2').style.display = 'none';
    loadOptions();
  }, false);
  $('Settings_Tabs_General').addEventListener('click', function() {
    $('Settings_Tabs_Interface').removeAttribute('active');
    $('Settings_Tabs_General').setAttribute('active', 'true');
    $('tc-1').style.display = 'none';
    $('tc-2').style.display = 'block';
    loadOptions();
  }, false);
};