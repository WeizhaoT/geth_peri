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

${perigee}/geth --ropsten --datadir /data/blockchain/ropsten --syncmode "snap" \
    --loggypath $gethdir/loggy/configs/listener_ropsten.json \
    --peri $gethdir/BOT/perigee_configs/${pcfg}_screened_short.json \
    --cache 12288 --verbosity 3 --port 30304 \
    --ipcpath ~/ipc/ropsten.ipc \
    --maxpeers $maxp