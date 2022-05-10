maxp=6
verb=3
pcfg=inactive_screened
if [ $# -ge 1 ]; then
    maxp=$1;
fi
if [ $# -ge 2 ]; then
    if [ $2 -ne 0 ]; then
        pcfg=active_$2_screened;
    fi;
fi
if [ $# -ge 3 ]; then
    verb=$3;
fi

gethdir="/home/ubuntu/geth_ag"
perigee="$gethdir/build/bin"

${perigee}/geth --mainnet --datadir /data/blockchain/mainnet --syncmode "snap" \
    --loggypath $gethdir/loggy/configs/listener_long.json \
    --peri $gethdir/BOT/perigee_configs/${pcfg}.json \
    --cache 12288 --verbosity $verb --port 30303 \
    --ipcpath ~/ipc/mainnet.ipc \
    --maxpeers $maxp \
    --ws --ws.port 8546