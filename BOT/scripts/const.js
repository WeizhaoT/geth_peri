
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
const VICTIM_ADDR = ['0x033d5cd2b6ce13254d26282497ef447d8ad03705'];
const VICTIM_CONTRACTS = [
    '0xAC3B45FD0a44f666365c01f4BE4c558c5BA9F9CB',
    '0x029Ccb6cd2778d3B31869b89E056cA4D3e99A121',
    '0x1A953c8e04BBDbBF0C51B59a56bBDeb6a7114Dc6'
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