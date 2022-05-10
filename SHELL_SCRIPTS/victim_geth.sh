verb=3

# if [ $# -ge 2 ]; then
#     inbport=$2;
# fi

# if [ $# -ge 3 ]; then
#     port=$3;
# fi

# if [ $# -ge 4 ]; then
#     verb=$4
# fi

gethdir="/home/ubuntu/geth_logger"
perigee="$gethdir/build/bin"

${perigee}/geth --ropsten --datadir /data/blockchain/victim --syncmode "snap" \
    --loggypath $gethdir/loggy/configs/victim.json \
    --peri $gethdir/BOT/perigee_configs/victim.json \
    --maxpeers 50 --cache 4096 --verbosity $verb --port 30304 \
    --ipcpath ~/ipc/victim.ipc \
    --unlock 0x033D5Cd2b6cE13254d26282497eF447D8AD03705 --password /data/keys/victim
