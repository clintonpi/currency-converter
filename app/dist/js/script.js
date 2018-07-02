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

    fetch('https://free.currencyconverterapi.com/api/v5/convert?q=' + query).then(function (convertion) {
      return convertion.json();
    }).then(function (convertionData) {
      var convertionRate = convertionData.results[query].val;
      var amount = document.querySelector('#amount').value;
      var total = (amount * convertionRate).toFixed(2);

      document.querySelector('h2').innerText = amount + ' ' + from + ' = ' + total + ' ' + to;
    });
  });
})();