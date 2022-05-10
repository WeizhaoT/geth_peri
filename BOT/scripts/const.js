
const Web3 = require("web3");
const fs = require("fs-extra");
const net = require("net");
const path = require('path');
const axios = require('axios');
const colors = require("colors");
const abiDecoder = require('abi-decoder');
const EventEmitter = require('events');
const sprintf = require('sprintf-js').sprintf

const TX_DIR = '/data/smart_contracts/transactions';
const IPC_DIR = '/home/ubuntu/ipc';
const LOG_DIR = '/data/logs';
const BUILD_DIR = '/data/smart_contracts/build';
const DEPLOY_DIR = '/data/smart_contracts/deploy';
const VICTIM_ADDR = ['0x18c930d5EA5e33A4b633Cf52d5e83278a6080347'];
const VICTIM_CONTRACTS = [
];

const N_CONFIRMATION = 12;

const FAIL = colors.red('FAIL');
const SUCCESS = colors.brightCyan('Success');


function highlightResult(result) {
    if (result == 'success') {
        return SUCCESS;
    } else {
        return FAIL;
    }
}

function getTimeString() {
    now = new Date();
    month = now.getMonth() + 1;
    date = now.getDate();
    hours = now.getHours();
    minutes = now.getMinutes();
    seconds = now.getSeconds();
    millis = now.getMilliseconds();

    return sprintf("[%02d-%02d|%02d:%02d:%02d.%03d]", month, date, hours, minutes, seconds, millis)
}


module.exports = {
    Web3, fs, net, path, axios, colors, abiDecoder, EventEmitter, TX_DIR, IPC_DIR, LOG_DIR, BUILD_DIR, DEPLOY_DIR, VICTIM_ADDR, VICTIM_CONTRACTS, N_CONFIRMATION, highlightResult, getTimeString
}