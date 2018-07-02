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

  document.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();

    const from = document.querySelector('#from').value;
    const to = document.querySelector('#to').value;
    const query = `${from}_${to}`;

    fetch(`https://free.currencyconverterapi.com/api/v5/convert?q=${query}`)
      .then(convertion => convertion.json())
      .then((convertionData) => {
        const convertionRate = convertionData.results[query].val;
        const amount = document.querySelector('#amount').value;
        const total = (amount * convertionRate).toFixed(2);

        document.querySelector('h2').innerText = `${amount} ${from} = ${total} ${to}`;
      });
  });
})();
