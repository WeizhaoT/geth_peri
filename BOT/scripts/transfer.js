const {
    Web3, fs, net, path, axios, colors, abiDecoder, EventEmitter, TX_DIR, IPC_DIR, LOG_DIR, BUILD_DIR, DEPLOY_DIR, VICTIM_ADDR, VICTIM_CONTRACTS, N_CONFIRMATION, highlightResult, getTimeString
} = require('./const')

const w3 = new Web3(new Web3.providers.IpcProvider(path.resolve(IPC_DIR, 'ropsten.ipc'), net));

const date = new Date();

// const w3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
// const web3 = new Web3(new Web3.providers.HttpProvider("https://ropsten.infura.io/TOKEN"));

const MAXREP = 500;

var PERIOD;
var logDir = path.resolve(LOG_DIR, 'r_victim');

async function getCurrentGasPrices() {
    let response = await axios.get('https://ethgasstation.info/json/ethgasAPI.json');
    let prices = {
        low: response.data.safeLow / 10,
        medium: response.data.average / 10,
        high: response.data.fast / 10,
        top: response.data.fastest / 10
    };
    return prices;
}


async function transfer(account, num) {
    if (num >= MAXREP) {
        return;
    }

    var bus = new EventEmitter();


    // var nonce = await w3.eth.getTransactionCount(account, 'latest');
    var nonce = await w3.eth.getTransactionCount(account, 'pending');
    var gasPrices = await getCurrentGasPrices();
    var gasPrice = Math.round(14 * 1000000000);
    // var gasPrice = Math.round(gasPrices.top * 1000000000);

    var receiptGot = false;

    let rawTx = {
        nonce: nonce,
        from: account,
        gasPrice: gasPrice,
        gas: '30000',
        to: '0x033D5Cd2b6cE13254d26282497eF447D8AD03705',
        value: w3.utils.toHex(w3.utils.toWei('1', 'gwei'))
    };

    var signed = await w3.eth.signTransaction(rawTx).catch(err => {
        console.error(getTimeString() + ' ' + err);
        process.exit(1);
    });

    console.log(getTimeString() + ' ' + colors.brightRed(
        "Planning to send " + signed['tx']['hash'] + ' ( GP: ' + (gasPrice / 1e9) + ' gwei, Nonce: ' + nonce + ' )'
    ));

    w3.eth.sendSignedTransaction(signed['raw'])
        .on('transactionHash', function (hash) {
            // console.log(getTimeString() + ' ' + colors.yellow('Init take tx : ' + hash));
        }).on('receipt', (receipt) => {
            if (!receiptGot) {
                console.log(getTimeString() + ' ' + 'Receipt got of tx ' + receipt['transactionHash']);
                receiptGot = true;
                bus.emit('unlocked', signed['tx']['hash']);
            }
        }).on('confirmation', (nblock, receipt) => {
            if (nblock == N_CONFIRMATION) {
                console.log(getTimeString() + ' ' + colors.brightGreen('Tx ' + receipt['transactionHash'] + ' confirmed by ' + N_CONFIRMATION + ' blocks'));
                bus.emit('unlocked', signed['tx']['hash']);
            }
        }).on('error', (err, receipt) => {
            console.error(getTimeString() + ' ' + err);
            console.error(getTimeString() + ' ' + receipt);
        }).catch(err => {
            console.error(getTimeString() + ' ' + err);
            if (err.toString().includes("Transaction was not mined within")) {
                return;
            } else {
                process.exit(1);
            }
        });

    await new Promise(resolve => bus.once('unlocked', (hash) => {
        console.log(getTimeString() + ' Accepted ' + hash + ', ' + colors.brightMagenta('Next transfer scheduled.' + '\n'));
        resolve();
    }));

    setTimeout(() => { transfer(account, num + 1); }, PERIOD);
}

async function main() {
    var myArgs = process.argv.slice(2);

    if (myArgs.length < 1) {
        console.error("Usage: node this.js <period (minutes)>")
        process.exit(1)
    } else {
        PERIOD = parseInt(myArgs[0])
        if (PERIOD == NaN) {
            console.error("Usage: node this.js <period (minutes)>")
            process.exit(1)
        }
        PERIOD = PERIOD * 60000
    }

    // var initTable = {
    //     table: []
    // }

    // for (let name of ['take', 'fund']) {
    //     var filename = path.resolve(TX_DIR, name + ".json");
    //     if (!fs.existsSync(filename)) {
    //         fs.writeFile(filename, JSON.stringify(initTable), 'utf8', () => { });
    //     }
    // }

    accounts = (await w3.eth.getAccounts());

    for (account of accounts) {
        // account = accounts[0]
        console.log(getTimeString() + ' ' + colors.brightGreen('Started transfer from ' + account))
        transfer(account, 0);
    }
}

main();