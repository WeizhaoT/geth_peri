const {
    Web3, net, getTimeString
} = require('./const')
// const Web3 = require("web3")
// const net = require("net")
const ethers = require("ethers")
const provider = ethers.providers.getDefaultProvider('goerli')
const { FlashbotsBundleProvider } = require('@flashbots/ethers-provider-bundle')
// const provider = new ethers.providers.JsonRpcProvider({ url: ETHEREUM_RPC_URL })
// Standard json rpc provider directly from ethers.js. For example you can use Infura, Alchemy, or your own node.
// const provider = new ethers.providers.IpcProvider({ path: '/home/ubuntu/ipc/goerli.ipc' })

const w3 = new Web3(new Web3.providers.IpcProvider('/home/ubuntu/ipc/goerli.ipc', net));
// console.log(w3.eth)

async function main() {
    var accounts = await w3.eth.getAccounts();
    account = accounts[0]

    console.log(account)

    const authSigner = new ethers.Wallet('0x4d0e5ff8f539104716fc8ee2a7179832181e436a2a2e30d6da2856e5ca51dbfe', provider)
    // const authSigner = new ethers.Wallet('0x0123456789012345678901234567890123456789012345678901234567890123')
    // `authSigner` is an Ethereum private key that does NOT store funds and is NOT your bot's primary key.
    // This is an identifying key for signing payloads to establish reputation and whitelisting

    const flashbotsProvider = await FlashbotsBundleProvider.create(
        provider,
        authSigner,
        'https://relay-goerli.flashbots.net/',
        'goerli')
    // const flashbotsProvider = await FlashbotsBundleProvider.create(provider, authSigner)
    // // Flashbots provider requires passing in a standard provider and an auth signer

    var nonce = await w3.eth.getTransactionCount(account, 'pending');
    console.log(nonce, typeof nonce)

    // process.exit(1);

    var gasPrice = Math.round(3 * 1000000000);
    var gasPriceH = Math.round(3.1 * 1000000000);

    let rawTx1 = {
        nonce: nonce + 1,
        from: account,
        gasPrice: gasPriceH,
        gasLimit: '0x7530',
        to: '0x10956A68Bc4C7387Ffdf4d6d4833Fdf00e71C217',
        value: w3.utils.toHex(w3.utils.toWei('1', 'gwei'))
    };

    // let rawTx2 = {
    //     from: account,
    //     to: '0x0E6bF6417aD6BA652990a29f14271b232492CCd2',
    //     type: 2,
    //     maxFeePerGas: Math.round(5 * 1000000000),
    //     maxPriorityFeePerGas: Math.round(1 * 1000000000),
    //     gasLimit: 21000,
    //     data: '0x',
    //     chainId: '0x5',
    //     nonce: nonce
    // };

    let rawTx2 = {
        nonce: Number(nonce),
        from: account,
        gasPrice: gasPrice,
        gasLimit: '0x7530',
        to: '0x0E6bF6417aD6BA652990a29f14271b232492CCd2',
        value: w3.utils.toHex(w3.utils.toWei('1', 'gwei'))
    };

    let rawTx3 = {
        nonce: nonce + 1,
        from: account,
        gasPrice: gasPrice,
        gasLimit: '0x7530',
        to: '0x5eD9b924a5B7d2C3D53d95fE5D4b2A9cEcE81531',
        value: w3.utils.toHex(w3.utils.toWei('1', 'gwei'))
    };

    // var signed1 = await w3.eth.signTransaction(rawTx1).catch(err => {
    //     console.error(getTimeString() + ' ' + err);
    //     process.exit(1);
    // });

    // w3.eth.sendSignedTransaction(signed2['raw'])
    //     .on('transactionHash', function (hash) {
    //         // console.log(getTimeString() + ' ' + colors.yellow('Init take tx : ' + hash));
    //     }).on('receipt', (receipt) => {
    //         if (!receiptGot) {
    //             console.log(getTimeString() + ' ' + 'Receipt got of tx ' + receipt['transactionHash']);
    //             receiptGot = true;
    //             bus.emit('unlocked', signed['tx']['hash']);
    //         }
    //     }).on('confirmation', (nblock, receipt) => {
    //         if (nblock == N_CONFIRMATION) {
    //             console.log(getTimeString() + ' ' + colors.brightGreen('Tx ' + receipt['transactionHash'] + ' confirmed by ' + N_CONFIRMATION + ' blocks'));
    //             bus.emit('unlocked', signed['tx']['hash']);
    //         }
    //     }).on('error', (err, receipt) => {
    //         console.error(getTimeString() + ' ' + err);
    //         console.error(getTimeString() + ' ' + receipt);
    //     }).catch(err => {
    //         console.error(getTimeString() + ' ' + err);
    //         process.exit(1);
    //     });

    // process.exit(1);


    const blockNumber = await provider.getBlockNumber()

    // console.log(await flashbotsProvider.getUserStats())

    const minTimestamp = (await provider.getBlock(blockNumber)).timestamp
    const maxTimestamp = minTimestamp + 120
    // const bundlePromises = [blockNumber + 1, blockNumber + 2].map((targetBlockNumber) =>
    //     flashbotsProvider.sendBundle(
    //         [
    //             {
    //                 signedTransaction: SIGNED_ORACLE_UPDATE_FROM_PENDING_POOL // serialized signed transaction hex
    //             },
    //             {
    //                 signer: wallet, // ethers signer
    //                 transaction: transaction // ethers populated transaction object
    //             }
    //         ],
    //         targetBlockNumber, // block number at which this bundle is valid
    //         {
    //             minTimestamp, // optional minimum timestamp at which this bundle is valid (inclusive)
    //             maxTimestamp, // optional maximum timestamp at which this bundle is valid (inclusive)
    //             // revertingTxHashes: [tx1, tx2] // optional list of transaction hashes allowed to revert. Without specifying here, any revert invalidates the entire bundle.
    //         }
    //     )
    // )

    // console.log(bundlePromises)

    var bundle1 = [
        {
            signer: authSigner, // ethers signer
            transaction: rawTx2 // ethers populated transaction object
            // signedTransaction: signed2['raw']
        },
        {
            signer: authSigner, // ethers signer
            transaction: rawTx3 // ethers populated transaction object
        }
    ]

    var bundle2 = [
        {
            signer: authSigner, // ethers signer
            transaction: rawTx2 // ethers populated transaction object
            // signedTransaction: signed2['raw']
        },
        {
            signer: authSigner, // ethers signer
            transaction: rawTx1 // ethers populated transaction object
        }
    ]

    // const signedBundle = await flashbotsProvider.signBundle(bundle).catch(err => {
    //     console.error(err);
    //     process.exit(1);
    // })

    // process.exit(1);

    for (var i = 3; i <= 3; i++) {
        const bundleReceipt = await flashbotsProvider.sendBundle(bundle1, blockNumber + i, { minTimestamp, maxTimestamp }).catch(err => {
            console.error(getTimeString() + ' ' + err);
            process.exit(1);
        });
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    for (var i = 3; i <= 3; i++) {
        const bundleReceipt = await flashbotsProvider.sendBundle(bundle2, blockNumber + i, { minTimestamp, maxTimestamp }).catch(err => {
            console.error(getTimeString() + ' ' + err);
            process.exit(1);
        });
    }


    // console.log('\nSimulate:\n' + (JSON.stringify(await bundleReceipt.simulate(), null, 2)) + '\n')
    // console.log('Receipts:\n' + (await bundleReceipt.receipts()) + '\n')
    // console.log('Wait: \n' + (await bundleReceipt.wait()) + '\n')
    process.exit(1);
}

main();