const {
    Web3, fs, net, path, axios, colors, EventEmitter, TX_DIR, IPC_DIR, LOG_DIR, BUILD_DIR, DEPLOY_DIR, VICTIM_ADDR, VICTIM_CONTRACTS, PERIOD, N_CONFIRMATION, highlightResult, getTimeString
} = require('./const')

var Mutex = require('async-mutex').Mutex;

var web3;
var subscription;
var logDir;
const mutex = new Mutex();

async function main() {
    var myArgs = process.argv.slice(2);

    if (myArgs.length <= 0) {
        console.error('Usage: node listener.js <node_name>');
        process.exit(1);
    } else {
        nodeName = myArgs[0];
        web3 = new Web3(new Web3.providers.IpcProvider(path.resolve(IPC_DIR, nodeName + '.ipc'), net));
        logDir = path.resolve(LOG_DIR, nodeName);
    }

    await init();

    console.log(getTimeString() + ' ' + colors.brightGreen('Observer initiated, # peers = ' + await web3.eth.net.getPeerCount()));

    subscription = web3.eth.subscribe('pendingTransactions', function (error, result) {
    }).on("data",
        async function (transactionHash) {
            let transaction = await web3.eth.getTransaction(transactionHash);
            if (isObserved(transaction)) {
                await logTransaction(transaction, (new Date()).getTime());
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
}

// function isObserved(tx) {
//     return tx != null && tx['to'] != null && VICTIM_CONTRACTS.includes(tx['to'].toLowerCase()) && parseTx(tx['input']) == 'take';
// }


function isObserved(tx) {
    return tx != null && tx['from'] != null && VICTIM_ADDR.includes(tx['from'].toLowerCase());
}



main();

async function isPending(transactionHash) {
    return await web3.eth.getTransactionReceipt(transactionHash) == null;
}

async function logTransaction(transaction, time) {
    let is_pending = await isPending(transaction['hash']);
    if (!is_pending) {
        console.log(getTimeString() + ' ' + colors.red('Error: Transaction ' + transaction['hash'] + ' is not pending!'))
    }

    try {
        resultObj = {
            hash: transaction['hash'],
            time: time,
            pending: is_pending
        };

        mutex.runExclusive(() => {
            var logStream = fs.createWriteStream(path.resolve(logDir, 'observe_logs_js.jsonl'), { flags: 'a' });
            logStream.write(JSON.stringify(resultObj));
            logStream.end('\n');
        });

        console.log(getTimeString() + ' ' + colors.brightCyan(JSON.stringify(resultObj)))
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
