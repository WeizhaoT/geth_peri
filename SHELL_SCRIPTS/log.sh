rm -rf /data/logs/$1_cache/ 
rm -rf /data/blockchain/$1/eth/nodes

if [ $# -gt 1 ]; then 
    if [ $2 == '-r' ]; then 
        rm -f /data/blockchain/$1/eth/nodekey
        echo "Warning: removed nodekey"
    fi
fi

mv /data/logs/$1 /data/logs/$1_cache

mkdir /data/logs/$1

