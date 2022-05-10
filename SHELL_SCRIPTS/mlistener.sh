maxp=6
pcfg=inactive
if [ $# -ge 1 ]; then
    maxp=$1;
fi
if [ $# -ge 2 ]; then
    pcfg=active_$2;
fi

gethdir="/home/ubuntu/geth_ag"
perigee="$gethdir/build/bin"

${perigee}/geth --mainnet --datadir /data/blockchain/mainnet --syncmode "snap" \
    --loggypath $gethdir/loggy/configs/listener.json \
    --peri $gethdir/BOT/perigee_configs/${pcfg}.json \
    --cache 12288 --verbosity 3 --port 30303 \
    --ipcpath ~/ipc/mainnet.ipc \
    --maxpeers $maxp \
    --ws --ws.port 8546 