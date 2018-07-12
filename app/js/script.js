import idb from 'idb';

(() => {
  fetch('https://free.currencyconverterapi.com/api/v5/currencies')
    .then(currencyResp => currencyResp.json())
    .then((currencyList) => {
      // currencyList is an object with one property, results,
      // which is also an object with currency objects as its properties
      const selections = document.querySelectorAll('select');

      (Object.values(currencyList.results))
      // returns an array of the values of the currencyList.results object properties
        .sort((a, b) => (a.id < b.id ? -1 : 1)) // sort currencies by id
        .forEach((currency) => {
          selections.forEach((selection) => {
            const currencyId = currency.id;
            selection.innerHTML += `<option value="${currencyId}">${currencyId} - ${currency.currencyName}</option>`;
          });
        });
    });

  // Make keyPath query so that only the latest (update) of the query will be stored
  // If keyPath is time queries will appear more than once.
  // then index by time (which makes use of the already gotten query)
  const dbPromise = idb.open('cc-db', 1, (upgradeDb) => {
    const rateStore = upgradeDb.createObjectStore('rates', { keyPath: 'query' });
    rateStore.createIndex('by-time', 'time');
  });

  document.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();

    const from = document.querySelector('#from').value;
    const to = document.querySelector('#to').value;
    const query = `${from}_${to}`;
    const display = document.querySelector('h2');
    const amount = (Number(document.querySelector('#amount').value)).toFixed(3);
    const rate = document.querySelector('#rate');
    const overlayLoader = document.querySelectorAll('.overlay')[0].style;
    const time = -Date.now(); // To make time go backwards
    let total;

    overlayLoader.display = 'flex';
    display.innerText = 'Convert from one currency to another';
    rate.innerText = 'Conversions you make will be saved for offline use!';

    if (from === to) {
      overlayLoader.display = 'none';
      total = amount;
      display.innerText = `${amount} ${from} = ${total} ${to}`;
      rate.innerText = "Let's be serious here please...";
      return;
    }

    fetch(`https://free.currencyconverterapi.com/api/v5/convert?q=${query}`)
      .then(conversion => conversion.json())
      .then((conversionData) => {
        const conversionRate = (conversionData.results[query].val).toFixed(3);

        overlayLoader.display = 'none';
        total = (amount * conversionRate).toFixed(3);
        display.innerText = `${amount} ${from} = ${total} ${to}`;

        if (amount !== '1.000' && from !== to) rate.innerText = `1 ${from} = ${conversionRate} ${to}`;

        // Add the fetched rate to indexDb
        dbPromise
          .then((db) => {
            const tx = db.transaction('rates', 'readwrite');
            const ratesStore = tx.objectStore('rates');
            ratesStore.put({ query, conversionRate, time });
            return tx.complete;
          });

        dbPromise
          .then((db) => {
            const tx = db.transaction('rates', 'readwrite');
            const ratesStore = tx.objectStore('rates');
            const timeIndex = ratesStore.index('by-time');

            return timeIndex.openCursor();
            // Could have used "null, 'prev'" as arguments to go backwards if time wasn't negative
          })
          .then((cursor) => {
            if (!cursor) return;
            return cursor.advance(200);
          })
          .then(function deleteQuery(cursor) {
            if (!cursor) return;
            cursor.delete();
            return cursor.continue().then(deleteQuery);
          });
      })
      .catch(() => {
        dbPromise
          .then((db) => {
            const tx = db.transaction('rates');
            const ratesStore = tx.objectStore('rates');
            const timeIndex = ratesStore.index('by-time');
            return timeIndex.getAll();
          })
          .then((storedConversions) => {
            const neededConversion = storedConversions
              .filter(storedConversion => storedConversion.query === query)[0];

            overlayLoader.display = 'none';

            if (!neededConversion) {
              const overlayError = document.querySelectorAll('.overlay')[1];
              overlayError.style.display = 'flex';
              overlayError.addEventListener('click', () => {
                overlayError.style.display = 'none';
              });
            } else {
              const { conversionRate } = neededConversion;

              total = (amount * conversionRate).toFixed(3);
              display.innerText = `${amount} ${from} = ${total} ${to}`;

              if (amount !== '1.000' && from !== to) {
                rate.innerText = `1 ${from} = ${conversionRate} ${to}`;
              } else {
                rate.innerText = 'This conversion was done offline!';
              }
            }
          });
      });
  });

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        // setup notifications to update sw
        if (!navigator.serviceWorker.controller) return;

        const notification = document.querySelector('#notification').style;
        const notifBtns = document.querySelectorAll('.notif-btns');

        const notify = (worker) => {
          notification.display = 'block';
          notifBtns.forEach((notifBtn) => {
            notifBtn.addEventListener('click', (e) => {
              if (e.target.innerText === 'Refresh') {
                worker.postMessage({ action: 'skipWaiting' });
              } else {
                notification.display = 'none';
              }
            });
          });
        };

        const trackInstalling = (worker) => {
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed') notify(worker);
          });
        };

        if (reg.waiting) notify(reg.waiting);

        if (reg.installing) trackInstalling(reg.installing);

        reg.addEventListener('updatefound', () => {
          trackInstalling(reg.installing);
        });
      });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }
})();
