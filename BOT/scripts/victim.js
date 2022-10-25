const {
    Web3, fs, net, path, axios, colors, abiDecoder, EventEmitter, TX_DIR, IPC_DIR, LOG_DIR, BUILD_DIR, DEPLOY_DIR, VICTIM_ADDR, VICTIM_CONTRACTS, N_CONFIRMATION, highlightResult, getTimeString
} = require('./const')

const w3 = new Web3(new Web3.providers.IpcProvider(path.resolve(IPC_DIR, 'r_victim.ipc'), net));

const date = new Date();

// const w3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
// const web3 = new Web3(new Web3.providers.HttpProvider("https://ropsten.infura.io/TOKEN"));

var PERIOD;
var CONTRACT;
var account;
var logDir = path.resolve(LOG_DIR, 'r_victim');


function updateTable(take, jsonobj) {
    var filename = path.resolve(TX_DIR, take ? "take.json" : "fund.json")

    fs.readFile(filename, 'utf8', function readFileCallback(err, data) {
        if (err) {
            console.error(err);
        } else {
            obj = JSON.parse(data); //now it an object
            obj.table.push(jsonobj); //add some data
            json = JSON.stringify(obj); //convert it back to json
            fs.writeFile(filename, json, 'utf8', () => { }); // write it back 
        }
    });
}

async function fundContract() {
    var bus = new EventEmitter();

    await CONTRACT.methods.put()
        .send({
            from: account,
            gas: 100000,
            gasPrice: w3.utils.toWei('2', 'gwei'),
            value: w3.utils.toWei('1', 'finney')
        }).on('transactionHash', function (hash) {
            console.log(getTimeString() + ' ' + 'Init fund tx : ' + hash);
        }).on('receipt', (receipt) => {
            console.log(getTimeString() + ' ' + 'Receipt got of tx ' + receipt['transactionHash']);
            fs.ensureDirSync(TX_DIR);
            // updateTable(false, receipt);
        }).on('confirmation', (nblock, receipt) => {
            if (nblock == N_CONFIRMATION) {
                console.log(getTimeString() + ' ' + colors.white('Tx ' + receipt['transactionHash'] + ' confirmed by ' + N_CONFIRMATION + ' blocks'));
                bus.emit('unlocked');
            }
        }).on('error', (err, receipt) => {
            console.error(getTimeString() + ' ' + err);
            console.error(getTimeString() + ' ' + receipt);
        }).catch(err => {
            console.error(getTimeString() + ' ' + "Fatal Error occurred: ")
            console.error(getTimeString() + ' ' + err);
            process.exit(1);
        });

    await new Promise(resolve => bus.once('unlocked', resolve));
    console.log(getTimeString() + ' ' + colors.brightMagenta('Next: take tx'));
    setTimeout(() => { takeFunds(); }, PERIOD / 2);
}

async function takeFunds() {
    var bus = new EventEmitter();

    await CONTRACT.methods.take()
        .send({
            from: account,
            gas: 100000,
            gasPrice: w3.utils.toWei('2', 'gwei'),
        }).on('transactionHash', function (hash) {
            console.log(getTimeString() + ' ' + colors.yellow('Init take tx : ' + hash));
        }).on('receipt', (receipt) => {
            console.log(getTimeString() + ' ' + 'Receipt got of tx ' + receipt['transactionHash']);
            recordEvent(receipt);
        }).on('confirmation', (nblock, receipt) => {
            if (nblock == N_CONFIRMATION) {
                console.log(getTimeString() + ' ' + colors.brightGreen('Tx ' + receipt['transactionHash'] + ' confirmed by ' + N_CONFIRMATION + ' blocks'));
                bus.emit('unlocked');
            }
        }).on('error', (err, receipt) => {
            console.error(getTimeString() + ' ' + err);
            console.error(getTimeString() + ' ' + receipt);
        }).catch(err => {
            console.error(getTimeString() + ' ' + err);
            process.exit(1);
        });

    await new Promise(resolve => bus.once('unlocked', resolve));
    console.log(getTimeString() + ' ' + colors.brightMagenta('Next: fund tx'));
    setTimeout(() => { fundContract(); }, PERIOD / 2);
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

    var initTable = {
        table: []
    }

    var constractJson = JSON.parse(fs.readFileSync(path.resolve(DEPLOY_DIR, 'victim.json')));
    const caddr = constractJson['addr']
    const abi = constractJson['abi']
    CONTRACT = new w3.eth.Contract(abi, caddr)

    for (let name of ['take', 'fund']) {
        var filename = path.resolve(TX_DIR, name + ".json");
        if (!fs.existsSync(filename)) {
            fs.writeFile(filename, JSON.stringify(initTable), 'utf8', () => { });
        }
    }

    account = (await w3.eth.getAccounts())[0];

    console.log(getTimeString() + ' ' + colors.brightGreen('Victim started at ' + account))

    takeFunds();
}

function recordEvent(receipt) {
    try {
        result = Object.keys(receipt['events'])[0];
        console.log(getTimeString() + ' ' + 'Result: ' + highlightResult(result) + ' (' + receipt['transactionHash'] + ')');

        resultObj = {
            this: receipt['transactionHash'],
            result: result,
            time: date.getTime()
        };

        var logStream = fs.createWriteStream(path.resolve(logDir, 'FR.jsonl'), { flags: 'a' });
        logStream.write(JSON.stringify(resultObj));
        logStream.end('\n');
    } catch (err) {
        console.error(getTimeString() + ' ' + err);
        process.exit(1);
    }
}

main();