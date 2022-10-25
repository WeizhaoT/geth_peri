// BOT Insertion

package eth

import (
	"fmt"
	"math"
	"math/big"
	"math/rand"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/mclock"
	"github.com/ethereum/go-ethereum/eth/ethconfig"
	"github.com/ethereum/go-ethereum/log"
	"github.com/ethereum/go-ethereum/loggy"
)

const (
	MaxOldArrivals = 100000
	ArrivalReplace = 30000
	NanoTranslator = 1000000000.0
	Milli2Nano     = 1000000
	QuantNum       = 10
)

var (
	h              = &handler{}
	PerigeeConfig  = &ethconfig.PerigeeConfig{}
	oldArrivals    = make(map[common.Hash]int64)
	arrivals       = make(map[common.Hash]int64)
	arrivalPerPeer = make(map[common.Hash]map[string]int64)
	targetTx       = make(map[common.Hash]bool)

	tempUnregistration = make(map[string]bool)

	mapsMutex    = sync.Mutex{}
	tempMapMutex = sync.Mutex{}

	MyAccount = make([]string, 0)
)

type txArrival struct {
	tx      common.Hash
	arrival int64
}

type idScore struct {
	id    string
	score float64
}

func init() {

}

func StartPerigee(pcfg *ethconfig.PerigeeConfig, hp *handler) {
	h = hp
	PerigeeConfig = pcfg
	ticker := time.NewTicker(time.Second * time.Duration(pcfg.Period))

	for {
		log.Warn("New Perigee period")
		<-ticker.C
		disconnectByScore()
	}
}

func disconnectByScore() {
	mapsMutex.Lock()
	// h.peers.lock.Lock()
	defer mapsMutex.Unlock()
	// defer h.peers.lock.Unlock()

	scores := getScores()
	numScores := len(scores)

	numReplace := int(math.Round(float64(h.maxPeers)*PerigeeConfig.ReplaceRatio)) + numScores - h.maxPeers
	if numReplace < 0 {
		numReplace = 0
	}

	showStats(scores)

	log.Warn(fmt.Sprintf("peerCount before dropping = %d", h.peers.len()))

	if !PerigeeConfig.Active {
		indices := make([]int, len(scores))
		for i := 0; i < len(indices); i++ {
			indices[i] = i
		}
		rand.Shuffle(len(indices), func(i, j int) {
			indices[i], indices[j] = indices[j], indices[i]
		})
		for i := 0; i < numReplace; i++ {
			id := scores[indices[i]].id
			h.removePeer(id)
			h.unregisterPeer(id)
			tempMapMutex.Lock()
			tempUnregistration[id] = true
			tempMapMutex.Unlock()
		}
	} else {
		for i := 0; i < numReplace; i++ {
			id := scores[i].id
			h.removePeer(id)
			h.unregisterPeer(id)
			tempMapMutex.Lock()
			tempUnregistration[id] = true
			tempMapMutex.Unlock()
		}
	}
	log.Warn(fmt.Sprintf("peerCount after dropping = %d", h.peers.len()))
	resetMaps()
}

// Lock is assumed to be held
func resetMaps() {
	for tx, arrival := range arrivals {
		oldArrivals[tx] = arrival
	}

	// Clear old arrival states which are assumed not to be forwarded anymore
	if len(oldArrivals) > MaxOldArrivals {
		i := 0
		listArrivals := make([]txArrival, len(oldArrivals))
		for tx, arrival := range oldArrivals {
			listArrivals[i] = txArrival{tx, arrival}
			i++
		}

		// Sort arrival time by ascending order
		sort.Slice(listArrivals, func(i, j int) bool {
			return listArrivals[i].arrival < listArrivals[j].arrival
		})

		// Delete the earliest arrivals
		for i := 0; i < ArrivalReplace; i++ {
			delete(oldArrivals, listArrivals[i].tx)
		}
	}

	// Reset arrival states
	arrivals = make(map[common.Hash]int64)
	arrivalPerPeer = make(map[common.Hash]map[string]int64)
	targetTx = make(map[common.Hash]bool)

	timer := time.NewTimer(time.Millisecond * 500)
	go func() {
		<-timer.C
		tempMapMutex.Lock()
		tempUnregistration = make(map[string]bool)
		tempMapMutex.Unlock()
		log.Warn(("temporary unregistration map cleared"))
	}()
}

func showStats(scores []idScore) {
	now := time.Now().String()
	absNow := mclock.Now()

	log.Warn(fmt.Sprintf("Perigee triggered at %s", now))

	numTx, numPeer := len(arrivals), len(scores)
	if PerigeeConfig.ScreenOnly {
		numTx = len(targetTx)
	}

	totalDeliveries := 0
	if PerigeeConfig.ScreenOnly {
		for tx := range targetTx {
			totalDeliveries += len(arrivalPerPeer[tx])
		}
	} else {
		for _, dmap := range arrivalPerPeer {
			totalDeliveries += len(dmap)
		}
	}

	avgDeliveries := float64(totalDeliveries) / float64(numTx)

	// Compute overall average delay
	totalScores := 0.0
	for _, idScore := range scores {
		totalScores += idScore.score
	}
	avgDelayInSec := totalScores / float64(numPeer) / NanoTranslator

	// Compute quantiles of delay
	quantiles := getQuantiles(scores)

	// Display all delays
	delayStr := alignScores(scores, false)

	// Display all quantiles
	quantStr := alignQuantiles(quantiles, false)

	log.Warn(fmt.Sprintf("Perigee Summary:\n  # tx: \t%d\n"+
		"  # peers: \t%d\n  avg. tx delivered by: %.2f peers\n"+
		"  avg. delay: %.6f sec\n"+
		"  1/%d ~ %d/%d quantiles (sec):\n    %s\n"+
		"  all delays (sec):\n%s",
		numTx, numPeer, avgDeliveries, avgDelayInSec, QuantNum, QuantNum-1, QuantNum, quantStr, delayStr))

	if loggy.Config.FlagPerigee {
		s := fmt.Sprintf("\"time\": \"%s\", \"abstime\": %d, ", now, absNow)
		s += fmt.Sprintf("\"num_tx\": %d, \"num_peers\": %d, ", numTx, numPeer)
		s += fmt.Sprintf("\"avg_deliveries\": %.2f, ", avgDeliveries)
		s += fmt.Sprintf("\"avg_delay\": %.6f, ", avgDelayInSec)
		s += fmt.Sprintf("\"quantiles\": %s, ", alignQuantiles(quantiles, true))
		s += fmt.Sprintf("\"all_delays\": %s", alignScores(scores, true))

		// s += ", \"peers\": ["

		// list_enode := make([]string, 0)
		// for _, peer := range h.peers.peers {
		// 	list_enode = append(list_enode, "\""+peer.Peer.Node().URLv4()+"\"")
		// }

		// s += strings.Join(list_enode, ", ")
		// s += "]"

		go loggy.Log(" {"+s+"}", loggy.PerigeeMsg, loggy.Inbound)
		log.Warn("Loggy recorded perigee status")
	}
}

// Unit: ns
func getScores() []idScore {
	// scores := make(map[string]float64)
	scores := []idScore{}

	// loop through the **currect** peers instead of recorded ones
	for id, peer := range h.peers.peers {
		birth := peer.Peer.Loggy_connectionStartTime.UnixNano()

		ntx, totalDelay, avgDelay := 0, int64(0), 0.0
		for tx, firstArrival := range arrivals {
			if PerigeeConfig.ScreenOnly {
				if _, isTarget := targetTx[tx]; !isTarget {
					continue
				}
			}
			if firstArrival < birth {
				continue
			}

			arrival, forwarded := arrivalPerPeer[tx][id]
			delay := arrival - firstArrival
			if !forwarded || delay > int64(PerigeeConfig.MaxDelayPenalty*Milli2Nano) {
				delay = int64(PerigeeConfig.MaxDelayPenalty * Milli2Nano)
			} else if PerigeeConfig.ScreenOnly {
				if !loggy.Config.FlagAllTx {
					if delay == 0 {
						loggy.ObserveAll(tx, peer.Node().URLv4(), firstArrival)
					}
				} else {
					loggy.ObserveAll(tx, peer.Node().URLv4(), arrival)
				}
			}

			ntx++
			totalDelay += delay
		}

		if ntx == 0 {
			avgDelay = float64(int64(PerigeeConfig.MaxDelayPenalty * Milli2Nano))
		} else {
			avgDelay = float64(totalDelay) / float64(ntx)
		}

		scores = append(scores, idScore{id, avgDelay})
	}

	// Scores are sorted by descending order
	sort.Slice(scores, func(i, j int) bool {
		return scores[i].score > scores[j].score
	})

	return scores
}

// Unit: ns
func getQuantiles(scores []idScore) []float64 {
	quantiles := make([]float64, QuantNum-1)
	maxpeers := float64(h.maxPeers)
	for i := 1; i < QuantNum; i++ {
		index := maxpeers * float64(i) / float64(QuantNum)
		index_int := int(index) // floor of index
		iscore := len(scores) - 1 - index_int
		w_lo, w_hi := float64(index_int)+1.0-index, index-float64(index_int)

		if index_int < len(scores)-1 {
			quantiles[i-1] = scores[iscore].score*w_lo + scores[iscore-1].score*w_hi
		} else if index_int == len(scores)-1 {
			quantiles[i-1] = scores[iscore].score*w_lo + float64(PerigeeConfig.MaxDelayPenalty*Milli2Nano)*w_hi
		} else {
			quantiles[i-1] = float64(PerigeeConfig.MaxDelayPenalty * Milli2Nano)
		}
	}

	return quantiles
}

func alignQuantiles(quants []float64, flagJson bool) string {
	quantEntry := make([]string, len(quants))
	for i := 0; i < len(quants); i++ {
		quantEntry[i] = fmt.Sprintf("%6.3f", quants[i]/NanoTranslator)
	}
	arrText := strings.Join(quantEntry, ", ")
	if flagJson {
		return "[" + arrText + "]"
	} else {
		return arrText
	}
}

func alignScores(scores []idScore, flagJson bool) string {
	if flagJson {
		var delayEntry []string
		for i := len(scores) - 1; i >= 0; i-- {
			delayEntry = append(delayEntry, fmt.Sprintf("%6.3f", scores[i].score/NanoTranslator))
		}
		return fmt.Sprintf("[%s]", strings.Join(delayEntry, ", "))
	} else {
		var delayText, delayLine []string
		j := 0
		for i := len(scores) - 1; i >= 0; i-- {
			delayLine = append(delayLine, fmt.Sprintf("%6.3f", scores[i].score/NanoTranslator))

			if j++; i == 0 || j >= 25 {
				delayText = append(delayText, "    "+strings.Join(delayLine, ", "))
				delayLine = []string{}
				j = 0
			}
		}
		return strings.Join(delayText, "\n")
	}
}

func isScreened(addr common.Address) bool {
	if isMyself(addr) {
		return false
	}

	for i := 0; i < len(PerigeeConfig.ScreenList); i++ {
		if strings.EqualFold(addr.Hex(), PerigeeConfig.ScreenList[i]) {
			return true
		}
	}
	return false
}

func isMyself(addr common.Address) bool {
	for _, account := range MyAccount {
		if strings.EqualFold(addr.Hex(), account) {
			return true
		}
	}
	return false
}

func isSampledTx(txHash common.Hash) bool {
	if PerigeeConfig.ObservedTxRatio <= 0 {
		return false
	}
	if PerigeeConfig.ObservedTxRatio == 1 {
		return true
	}

	z := big.NewInt(0)
	return z.Mod(txHash.Big(), big.NewInt(int64(PerigeeConfig.ObservedTxRatio))).Cmp(big.NewInt(0)) == 0
}
