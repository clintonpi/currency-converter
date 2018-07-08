'use strict';

(function () {
  fetch('https://free.currencyconverterapi.com/api/v5/currencies').then(function (currencyResp) {
    return currencyResp.json();
  }).then(function (currencyList) {
    // currencyList is an object with one property, results,
    // which is also an object with currency objects as its properties
    var selections = document.querySelectorAll('select');

    Object.values(currencyList.results).
    // returns an array of the values of the currencyList.results object properties
    sort(function (a, b) {
      return a.id < b.id ? -1 : 1;
    }) // sort currencies by id
    .forEach(function (currency) {
      selections.forEach(function (selection) {
        var currencyId = currency.id;
        selection.innerHTML += '<option value="' + currencyId + '">' + currencyId + ' - ' + currency.currencyName + '</option>';
      });
    });
  });

  document.querySelector('form').addEventListener('submit', function (e) {
    e.preventDefault();

    var from = document.querySelector('#from').value;
    var to = document.querySelector('#to').value;
    var query = from + '_' + to;
    var display = document.querySelector('h2');
    var amount = Number(document.querySelector('#amount').value).toFixed(3);
    var rate = document.querySelector('#rate');
    var overlayLoader = document.querySelectorAll('.overlay')[0].style;
    var total = void 0;

    overlayLoader.display = 'flex';
    display.innerText = 'Convert from one currency to another';
    rate.innerText = 'Conversions you make will be saved for offline use!';

    if (from === to) {
      overlayLoader.display = 'none';
      total = amount;
      display.innerText = amount + ' ' + from + ' = ' + total + ' ' + to;
      rate.innerText = "Let's be serious here please...";
      return;
    }

    fetch('https://free.currencyconverterapi.com/api/v5/convert?q=' + query).then(function (convertion) {
      return convertion.json();
    }).then(function (convertionData) {
      var convertionRate = convertionData.results[query].val.toFixed(3);

      overlayLoader.display = 'none';
      total = (amount * convertionRate).toFixed(3);
      display.innerText = amount + ' ' + from + ' = ' + total + ' ' + to;

      if (amount !== '1.000' && from !== to) rate.innerText = '1 ' + from + ' = ' + convertionRate + ' ' + to;
    }).catch(function () {
      var overlayError = document.querySelectorAll('.overlay')[1];
      overlayError.style.display = 'flex';
      overlayError.addEventListener('click', function () {
        overlayError.style.display = 'none';
      });
      overlayLoader.display = 'none';
    });
  });

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(function (reg) {
      // setup notifications to update sw
      if (!navigator.serviceWorker.controller) return;

      var notification = document.querySelector('#notification').style;
      var notifBtns = document.querySelectorAll('.notif-btns');

      var notify = function notify(worker) {
        notification.display = 'block';
        notifBtns.forEach(function (notifBtn) {
          notifBtn.addEventListener('click', function (e) {
            if (e.target.innerText === 'Refresh') {
              worker.postMessage({ action: 'skipWaiting' });
            } else {
              notification.display = 'none';
            }
          });
        });
      };

      var trackInstalling = function trackInstalling(worker) {
        worker.addEventListener('statechange', function () {
          if (worker.state === 'installed') notify(worker);
        });
      };

      if (reg.waiting) notify(reg.waiting);

      if (reg.installing) trackInstalling(reg.installing);

      reg.addEventListener('updatefound', function () {
        trackInstalling(reg.installing);
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange', function () {
      window.location.reload();
    });
  }
})();