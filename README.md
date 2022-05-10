## Customized Go Ethereum for Latency Measurement

Customized Go-Ethereum client supporting Peri and latency measurement on Ethereum mainnet and testnets.

This is customized based on [the last commit on Jan 7, 2022 of go-ethereum](https://github.com/ethereum/go-ethereum/tree/1884f37f2c772d6f1d567432e76cbd7b90d442a9). 

See the [original README documentation](README_OF_ORIGINAL_GETH.md) for other details. 


## Setup

This project requires a Go (version 1.14 or later), a C compiler, Python 3.9 or later, and node.js.

Install ntp server. On Linux, install the following executables.
```shell
sudo apt-get update 
sudo apt-get install -y ntp ntpdate
```

Install the following python packages.
```shell
pip install ntplib schedule web3 
```

Install the following node.js packages.
```shell
npm install web3 fs-extra net path axios colors abi-decoder events sprintf-js async-mutex
```

Once the dependencies are installed, run 
```shell
make geth
```

## Running `geth` on Ethereum P2P network

### Running the Node <a id="run-node"></a>

To run a node on the mainnet with maximum peer count 50, execute the command 
```shell
./build/bin/geth --mainnet --maxpeers 50 --datadir path_to_chaindata \
    --cache 12288 --ws --ws.port 8546  --ipcpath path_to_ipc \
    --loggypath path_to_loggy/loggy_example.json \
    --peri path_to_peri/peri_example.json 
```

If the host machine does not have 12GB RAM, try to reduce the `--cache` argument in MB. Variants of this command are packed into shell scripts in 
```shell
SHELL_SCRIPTS/
    |- mlistener.sh   #  listener nodes on mainnet for global latency measurement
    |- mtlistener.sh  #  listener nodes on mainnet for targeted latency measurement
    |- rtlistener.sh  #  listener nodes on Ropsten for targeted latency measurement
    |- rttransfer.sh  #  victim nodes on Ropsten for targeted latency measurement
    |- ktlistener.sh  #  listener nodes on Rinkeby for targeted latency measurement
    |- kttransfer.sh  #  victim nodes on Rinkeby for targeted latency measurement
```

### Access to `geth` Console
When the node starts running, run the following command to get access to the javascript console of geth. This is used for tracking peers on-the-fly or checking synchronization progress.  
```shell
./build/bin/geth attach path_to_ipc 
```

This is packed into shell script `SHELL_SCRIPTS/check.sh`. 


### Loggy Configuration

The config of logger is fed to the `--loggypath` argument as the path to a json config file. Here is an example of [`path_to_loggy/loggy_example.json`](#run-node) (See [example file](loggy/configs/listener.json)).

```json
{
    "FlagLoggy": false, 
    "FlagConn": true,
    "FlagConnWarn": false,
    "FlagPerigee": true,
    "FlagForward": true,
    "FlagAllTx": false,
    "FlagObserve": true,
    "FlagBroadcast": false,
    "EPOCH_DURATION": 3600,
    "LOGS_BASEPATH": "/data/logs/mainnet"
}
```

The meaning of the fields are listed below:
| Field            | Description (if is a flag, when `true`)                               |
| ---------------- | --------------------------------------------------------------------- |
| `FlagLoggy`      | [DEBUG] placeholder; set to `false`                                   |
| `FlagConn`       | record the peer connections                                           |
| `FlagConnWarn`   | warn about peer disconnections on the command line                    |
| `FlagPerigee`    | record the Peri report on peer scores and actions                     |
| `FlagForward`    | not block a relevant transaction from being forwarded                 |
| `FlagAllTx`      | record late deliveries too (instead only the first deliveries of txs) |
| `FlagObserve`    | record transactions; when `false`, no transaction is recorded         |
| `FlagBroadcast`  | record transaction broadcasting activities                            |
| `EPOCH_DURATION` | number of seconds before the logger creates a new file for logging    |
| `LOGS_BASEPATH`  | directory to the logs                                                 |

### Peri Configuration

The config of logger is fed to the `--peri` argument as the path to a json config file. Here is an example of [`path_to_peri/peri_example.json`](#run-node) (See [example file](BOT/perigee_configs/inactive.json)).

```json
{
    "Active": false,
    "Targeted": false,
    "ShowTxDelivery": false,
    "Period": 1200,
    "ReplaceRatio": 0,
    "DialRatio": 3,
    "MaxDelayPenalty": 30000,
    "ObservedTxRatio": 4,
    "TargetAccountList": [],
    "NoPeerIPList": ["34.228.74.149", "35.172.193.247", "18.207.127.213", "3.82.23.217"]
}
```

The meaning of the fields are listed below:
| Field               | Description                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| `Active`            | global switch of Peri                                                                              |
| `Targeted`          | **global latency if `false`, targeted latency if `true` (target accounts in `TargetAccountList`)** |
| `ObservedTxRatio`   | (1 / sampling rate) of global latency; must be int                                                 |
| `ShowTxDelivery`    | [DEBUG] print log of relevant transaction arrivals to command line if `true`                       |
| `Period`            | Peri period length in seconds                                                                      |
| `ReplaceRatio`      | proportion of peers to be replaced                                                                 |
| `DialRatio`         | (1 / percentage of outbound peers). Must be int. 1 for Peri/Hybrid and 3 for Baseline              |
| `MaxDelayPenalty`   | $\bar \Delta$ in milliseconds                                                                      |
| `TargetAccountList` | list of target accounts                                                                            |
| `NoPeerIPList`      | node with IP addresses in this list are permanently blocked                                        |


## Running Script to Send Transactions

First, make sure the nodes are running and the accounts are unlocked. See [official documentation](https://geth.ethereum.org/docs/interface/managing-your-accounts) for details.

Then, run this command to transfer 1 Gwei every 2 minutes from each unlocked account. 
```shell
node BOT/scripts/transfer.js 2
```

*Note: It may be necessary to change the gas price oracle in the scripts.*

## Running NTP Queries to Get Clock Offsets

Run the following command to keep recording clock differences between the host machine and multiple external IP addresses (for example, `1.1.1.1` and `2.2.2.2`). 
```shell
python SHELL_SCRIPTS/ntpm.py --logpath path_to_ntp_logs --ip 1.1.1.1 2.2.2.2
```



## BloXroute

Check how to deploy a gateway and connect to a full node in the [official website](https://docs.bloxroute.com/). It requires that `--ws` and `--ws.port` are set in `geth` command line arguments. 


## Experiment Data

The data consists of two parts: `geth`-logged and NTP clock differences. The former is under directory `LOGS_BASEPATH`, specified by the loggy configuration. The latter is under `path_to_ntp_logs`. These log files are sufficient for data analysis. 
