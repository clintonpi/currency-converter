(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

var _idb = require('idb');

var _idb2 = _interopRequireDefault(_idb);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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

  // Make keyPath query so that only the latest (update) of the query will be stored
  // If keyPath is time queries will appear more than once.
  // then index by time (which makes use of the already gotten query)
  var dbPromise = _idb2.default.open('cc-db', 1, function (upgradeDb) {
    var rateStore = upgradeDb.createObjectStore('rates', { keyPath: 'query' });
    rateStore.createIndex('by-time', 'time');
  });

  document.querySelector('form').addEventListener('submit', function (e) {
    e.preventDefault();

    var from = document.querySelector('#from').value;
    var to = document.querySelector('#to').value;
    var query = from + '_' + to;
    var amount = Number(document.querySelector('#amount').value).toFixed(3);
    var overlayLoader = document.querySelectorAll('.overlay')[0].style;

    var action = function action(_ref) {
      var _ref$loaderVisibility = _ref.loaderVisibility,
          loaderVisibility = _ref$loaderVisibility === undefined ? 'hidden' : _ref$loaderVisibility,
          _ref$loaderOpacity = _ref.loaderOpacity,
          loaderOpacity = _ref$loaderOpacity === undefined ? 0 : _ref$loaderOpacity,
          currentRate = _ref.currentRate,
          _ref$total = _ref.total,
          total = _ref$total === undefined ? (amount * currentRate).toFixed(3) : _ref$total,
          _ref$displayText = _ref.displayText,
          displayText = _ref$displayText === undefined ? amount + ' ' + from + ' = ' + total + ' ' + to : _ref$displayText,
          _ref$rateText = _ref.rateText,
          rateText = _ref$rateText === undefined ? 'Conversions you make will be saved for offline use!' : _ref$rateText;

      var display = document.querySelector('h2');
      var rate = document.querySelector('#rate');

      overlayLoader.visibility = loaderVisibility;
      overlayLoader.opacity = loaderOpacity;
      display.innerText = displayText;
      rate.innerText = rateText;
      window.scroll(0, 0);

      if (amount !== '1.000' && from !== to && currentRate) rate.innerText = '1 ' + from + ' = ' + currentRate + ' ' + to;
    };

    action({ loaderVisibility: 'visible', loaderOpacity: 1, displayText: 'Convert one currency to another' });

    if (from === to) {
      action({ total: amount, rateText: "Let's be serious here please..." });
      return;
    }

    fetch('https://free.currencyconverterapi.com/api/v5/convert?q=' + query).then(function (conversion) {
      return conversion.json();
    }).then(function (conversionData) {
      var conversionRate = conversionData.results[query].val.toFixed(3);

      action({ currentRate: conversionRate });

      // Add the fetched rate to indexDb
      dbPromise.then(function (db) {
        var tx = db.transaction('rates', 'readwrite');
        var ratesStore = tx.objectStore('rates');
        var time = -Date.now(); // To make time go backwards
        ratesStore.put({ query: query, conversionRate: conversionRate, time: time });
        return tx.complete;
      });

      dbPromise.then(function (db) {
        var tx = db.transaction('rates', 'readwrite');
        var ratesStore = tx.objectStore('rates');
        var timeIndex = ratesStore.index('by-time');

        return timeIndex.openCursor();
        // Could have used "null, 'prev'" as arguments to go backwards if time wasn't negative
      }).then(function (cursor) {
        if (!cursor) return;
        return cursor.advance(200);
      }).then(function deleteQuery(cursor) {
        if (!cursor) return;
        cursor.delete();
        return cursor.continue().then(deleteQuery);
      });
    }).catch(function () {
      dbPromise.then(function (db) {
        var tx = db.transaction('rates');
        var ratesStore = tx.objectStore('rates');
        var timeIndex = ratesStore.index('by-time');
        return timeIndex.getAll();
      }).then(function (storedConversions) {
        var neededConversion = storedConversions.filter(function (storedConversion) {
          return storedConversion.query === query;
        })[0];

        overlayLoader.visibility = 'hidden';
        overlayLoader.opacity = 0;

        if (!neededConversion) {
          var overlayError = document.querySelectorAll('.overlay')[1];

          var toggleError = function toggleError(visibility, switcher) {
            var message = document.querySelector('#message').style;
            overlayError.style.visibility = visibility;
            overlayError.style.opacity = switcher;
            message.transform = 'scale(' + switcher + ')';
          };

          toggleError('visible', 1);

          overlayError.addEventListener('click', function () {
            toggleError('hidden', 0);
          });
        } else {
          var conversionRate = neededConversion.conversionRate;

          action({ currentRate: conversionRate, rateText: 'This conversion was done offline!' });
        }
      });
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
},{"idb":2}],2:[function(require,module,exports){
'use strict';

(function() {
  function toArray(arr) {
    return Array.prototype.slice.call(arr);
  }

  function promisifyRequest(request) {
    return new Promise(function(resolve, reject) {
      request.onsuccess = function() {
        resolve(request.result);
      };

      request.onerror = function() {
        reject(request.error);
      };
    });
  }

  function promisifyRequestCall(obj, method, args) {
    var request;
    var p = new Promise(function(resolve, reject) {
      request = obj[method].apply(obj, args);
      promisifyRequest(request).then(resolve, reject);
    });

    p.request = request;
    return p;
  }

  function promisifyCursorRequestCall(obj, method, args) {
    var p = promisifyRequestCall(obj, method, args);
    return p.then(function(value) {
      if (!value) return;
      return new Cursor(value, p.request);
    });
  }

  function proxyProperties(ProxyClass, targetProp, properties) {
    properties.forEach(function(prop) {
      Object.defineProperty(ProxyClass.prototype, prop, {
        get: function() {
          return this[targetProp][prop];
        },
        set: function(val) {
          this[targetProp][prop] = val;
        }
      });
    });
  }

  function proxyRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function proxyMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return this[targetProp][prop].apply(this[targetProp], arguments);
      };
    });
  }

  function proxyCursorRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyCursorRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function Index(index) {
    this._index = index;
  }

  proxyProperties(Index, '_index', [
    'name',
    'keyPath',
    'multiEntry',
    'unique'
  ]);

  proxyRequestMethods(Index, '_index', IDBIndex, [
    'get',
    'getKey',
    'getAll',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(Index, '_index', IDBIndex, [
    'openCursor',
    'openKeyCursor'
  ]);

  function Cursor(cursor, request) {
    this._cursor = cursor;
    this._request = request;
  }

  proxyProperties(Cursor, '_cursor', [
    'direction',
    'key',
    'primaryKey',
    'value'
  ]);

  proxyRequestMethods(Cursor, '_cursor', IDBCursor, [
    'update',
    'delete'
  ]);

  // proxy 'next' methods
  ['advance', 'continue', 'continuePrimaryKey'].forEach(function(methodName) {
    if (!(methodName in IDBCursor.prototype)) return;
    Cursor.prototype[methodName] = function() {
      var cursor = this;
      var args = arguments;
      return Promise.resolve().then(function() {
        cursor._cursor[methodName].apply(cursor._cursor, args);
        return promisifyRequest(cursor._request).then(function(value) {
          if (!value) return;
          return new Cursor(value, cursor._request);
        });
      });
    };
  });

  function ObjectStore(store) {
    this._store = store;
  }

  ObjectStore.prototype.createIndex = function() {
    return new Index(this._store.createIndex.apply(this._store, arguments));
  };

  ObjectStore.prototype.index = function() {
    return new Index(this._store.index.apply(this._store, arguments));
  };

  proxyProperties(ObjectStore, '_store', [
    'name',
    'keyPath',
    'indexNames',
    'autoIncrement'
  ]);

  proxyRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'put',
    'add',
    'delete',
    'clear',
    'get',
    'getAll',
    'getKey',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'openCursor',
    'openKeyCursor'
  ]);

  proxyMethods(ObjectStore, '_store', IDBObjectStore, [
    'deleteIndex'
  ]);

  function Transaction(idbTransaction) {
    this._tx = idbTransaction;
    this.complete = new Promise(function(resolve, reject) {
      idbTransaction.oncomplete = function() {
        resolve();
      };
      idbTransaction.onerror = function() {
        reject(idbTransaction.error);
      };
      idbTransaction.onabort = function() {
        reject(idbTransaction.error);
      };
    });
  }

  Transaction.prototype.objectStore = function() {
    return new ObjectStore(this._tx.objectStore.apply(this._tx, arguments));
  };

  proxyProperties(Transaction, '_tx', [
    'objectStoreNames',
    'mode'
  ]);

  proxyMethods(Transaction, '_tx', IDBTransaction, [
    'abort'
  ]);

  function UpgradeDB(db, oldVersion, transaction) {
    this._db = db;
    this.oldVersion = oldVersion;
    this.transaction = new Transaction(transaction);
  }

  UpgradeDB.prototype.createObjectStore = function() {
    return new ObjectStore(this._db.createObjectStore.apply(this._db, arguments));
  };

  proxyProperties(UpgradeDB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(UpgradeDB, '_db', IDBDatabase, [
    'deleteObjectStore',
    'close'
  ]);

  function DB(db) {
    this._db = db;
  }

  DB.prototype.transaction = function() {
    return new Transaction(this._db.transaction.apply(this._db, arguments));
  };

  proxyProperties(DB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(DB, '_db', IDBDatabase, [
    'close'
  ]);

  // Add cursor iterators
  // TODO: remove this once browsers do the right thing with promises
  ['openCursor', 'openKeyCursor'].forEach(function(funcName) {
    [ObjectStore, Index].forEach(function(Constructor) {
      // Don't create iterateKeyCursor if openKeyCursor doesn't exist.
      if (!(funcName in Constructor.prototype)) return;

      Constructor.prototype[funcName.replace('open', 'iterate')] = function() {
        var args = toArray(arguments);
        var callback = args[args.length - 1];
        var nativeObject = this._store || this._index;
        var request = nativeObject[funcName].apply(nativeObject, args.slice(0, -1));
        request.onsuccess = function() {
          callback(request.result);
        };
      };
    });
  });

  // polyfill getAll
  [Index, ObjectStore].forEach(function(Constructor) {
    if (Constructor.prototype.getAll) return;
    Constructor.prototype.getAll = function(query, count) {
      var instance = this;
      var items = [];

      return new Promise(function(resolve) {
        instance.iterateCursor(query, function(cursor) {
          if (!cursor) {
            resolve(items);
            return;
          }
          items.push(cursor.value);

          if (count !== undefined && items.length == count) {
            resolve(items);
            return;
          }
          cursor.continue();
        });
      });
    };
  });

  var exp = {
    open: function(name, version, upgradeCallback) {
      var p = promisifyRequestCall(indexedDB, 'open', [name, version]);
      var request = p.request;

      if (request) {
        request.onupgradeneeded = function(event) {
          if (upgradeCallback) {
            upgradeCallback(new UpgradeDB(request.result, event.oldVersion, request.transaction));
          }
        };
      }

      return p.then(function(db) {
        return new DB(db);
      });
    },
    delete: function(name) {
      return promisifyRequestCall(indexedDB, 'deleteDatabase', [name]);
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = exp;
    module.exports.default = module.exports;
  }
  else {
    self.idb = exp;
  }
}());

},{}]},{},[1]);
