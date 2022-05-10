maxp=50
if [ $# -ge 1 ]; then
    maxp=$1;
fi

gethdir="/home/ubuntu/geth_ag"
perigee="$gethdir/build/bin"

${perigee}/geth --ropsten --datadir /data/blockchain/ropsten --syncmode "snap" \
    --loggypath $gethdir/loggy/configs/transfer_ropsten.json \
    --peri $gethdir/BOT/perigee_configs/inactive.json \
    --cache 12288 --verbosity 3 --port 30304 \
    --ipcpath ~/ipc/ropsten.ipc \
    --maxpeers $maxp \
    --unlock "0x7818853DC53ebD2835FC85c0369b75397681AE88,0x10956A68Bc4C7387Ffdf4d6d4833Fdf00e71C217,0x0E6bF6417aD6BA652990a29f14271b232492CCd2,0x5eD9b924a5B7d2C3D53d95fE5D4b2A9cEcE81531,0x5416D7d50fd2D09692C033A6606188936c9c7d31,0xd4417542DEe84879d5A74b24e75fF2EC74cdb1B8" --password ~/experiment/key/pw
