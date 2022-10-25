const {
    Web3, fs, net, path, axios, colors, abiDecoder, TX_DIR, IPC_DIR, LOG_DIR, BUILD_DIR, DEPLOY_DIR, VICTIM_ADDR, VICTIM_CONTRACTS, PERIOD, N_CONFIRMATION
} = require('./const')

const w3 = new Web3(new Web3.providers.IpcProvider('/home/ubuntu/ipc/r_victim.ipc', net));

// const w3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
// const web3 = new Web3(new Web3.providers.HttpProvider("https://ropsten.infura.io/TOKEN"));



function buildContract() {
    var solc = require("solc");
    var contractSource = fs.readFileSync('/home/ubuntu/geth_logger/BOT/contracts/victim.sol', 'utf8');

    var cfilename = "victim.sol"

    var input = {
        language: "Solidity",
        sources: {
            'victim.sol': {
                content: contractSource,
            },
        },
        settings: {
            outputSelection: {
                "*": {
                    "*": ["*"],
                },
            },
        },
    };

    var output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        console.error(output.errors);
        for (error of output.errors) {
            if (error.severity === 'error') {
                throw 'Compilation error -- process terminated';
            }
        }
    }

    // let contractName = 'victim';
    // console.log(output.contracts['victim.sol'][contractName])

    fs.ensureDirSync(BUILD_DIR);

    console.log(JSON.stringify(output.contracts))

    return
    // var key = 'victim'
    // fs.outputJsonSync(
    //     path.resolve(BUILD_DIR, `${key}.json`),
    //     {
    //         abi: output.contracts[cfilename][key]["abi"],
    //         bytecode: output.contracts[cfilename][key]["evm"]["bytecode"]["object"]
    //     },
    //     {
    //         spaces: 2,
    //         EOL: "\n"
    //     }
    // );

    // console.log('Build finished successfully!\n');

    // return output.contracts[cfilename][key]["abi"], output.contracts[cfilename][key]["evm"]["bytecode"]["object"]
}

async function deployContract(abi, bytecode) {
    victimContract = new w3.eth.Contract(abi);
    await victimContract.deploy({ data: bytecode })
        .send({
            from: VICTIM_ADDR[0],
            gas: 500000,
            gasPrice: w3.utils.toWei('1', 'gwei'),
            value: w3.utils.toWei('1', 'finney')
        }).on('transactionHash', function (hash) {
            console.log('Deployment tx : ' + hash);
        }).on('confirmation', () => { }).then((newContractInstance) => {
            var address = newContractInstance.options.address;
            console.log('Deployed Contract Address : ' + address);
            fs.ensureDirSync(DEPLOY_DIR);
            fs.outputJsonSync(
                path.resolve(DEPLOY_DIR, 'victim.json'),
                {
                    addr: address,
                    abi: abi
                },
                {
                    spaces: 2,
                    EOL: "\n"
                }
            );
            process.exit(0);
        }).catch(err => {
            console.error(err);
            process.exit(1);
        });
}

async function main() {
    var abi, bytecode = buildContract()
    // const contractJson = JSON.parse(fs.readFileSync(path.resolve(BUILD_DIR, 'victim.json')));


    // var abi = contractJson['abi'];
    // var bytecode = contractJson['bytecode'];

    // console.log(abi);
    // console.log(bytecode);

    // deployContract(abi, bytecode);
}

main();