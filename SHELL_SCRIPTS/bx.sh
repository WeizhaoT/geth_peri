port=30303
pubkey="-"
myip=$(dig +short myip.opendns.com @resolver1.opendns.com)
POSITIONAL_ARGS=()

if [ $# -lt 1 ]; then
    echo "Error (1): node not specified. Usage: bash bx.sh <node>"
    exit 1
else
    pubkey=$(head -n 1 /data/blockchain/$1/geth/pubkey)
    shift
fi

while [[ $# -gt 0 ]]; do
  case $1 in
    -i|--ip)
      myip="$2"
      shift # past argument
      shift # past value
      ;;
    -p|--port)
      port="$2"
      shift # past argument
      shift # past value
      ;;
    --default)
      DEFAULT=YES
      shift # past argument
      ;;
    -*|--*)
      echo "Unknown option $1"
      exit 1
      ;;
    *)
      POSITIONAL_ARGS+=("$1") # save positional arg
      shift # past argument
      ;;
  esac
done

enode="enode://$pubkey@$myip:$port"

docker run --publish 1801:1801 --publish 28332:28332 --publish 28333:28333 --volume /home/ubuntu/experiment/bx_artifacts:/app/ssl \
    bloxroute/bxgateway \
    --private-ssl-base-url file:///app/ssl \
    --blockchain-protocol Ethereum \
    --blockchain-network Mainnet \
    --blockchain-port 30303 \
    --enode $enode \
    --node-public-key=$pubkey \
    --rpc-host 0.0.0.0 \
    --ws True --ws-host 0.0.0.0 --ws-port 28333
