var storage = chrome.extension.getBackgroundPage().storage;
var readHistory = chrome.extension.getBackgroundPage().readHistory;
var clearStorageHistory = chrome.extension.getBackgroundPage().clearHistory;
// ------------------------------------------------------------------

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
      a.title = title; a.href = url;
      a.style.textDecoration = 'none';
      a.style.color = '#797979';
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
}, false);
document.getElementById('numberHistoryItems').addEventListener('change', function (e) {
  storage.write('numberHistoryItems', e.target.value);
  loadOptions();
}, false);
$(window).load(function() {
  loadOptions();
  $('#Settings_Tabs_Interface').addClass('active-tab');
  $('#Settings_Tabs_General').removeClass('active-tab');
  $('#tc-1').css('display', 'block');
  $('#tc-2').css('display', 'none');
  $(function() {
    $('#Settings_Tabs_Interface').click(function() {
      loadOptions();
      $('#Settings_Tabs_Interface').addClass('active-tab');
      $('#Settings_Tabs_General').removeClass('active-tab');
      $('#tc-1').css('display', 'block');
      $('#tc-2').css('display', 'none');
    });
    $('#Settings_Tabs_General').click(function() {
      loadOptions();
      $('#Settings_Tabs_Interface').removeClass('active-tab');
      $('#Settings_Tabs_General').addClass('active-tab');
      $('#tc-1').css('display', 'none');
      $('#tc-2').css('display', 'block');
    });
  });
});