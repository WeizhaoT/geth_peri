// BOT Insertion

package ethconfig

import (
	"encoding/json"
	"io/ioutil"
	"strings"

	"github.com/ethereum/go-ethereum/log"
)

type PerigeeConfig struct {
	Active          bool // if false, nothing special is done
	ScreenOnly      bool
	Period          uint64  // Period of peer reselection in seconds
	ReplaceRatio    float64 // 0~1, ratio of replaced peers in each epoch
	DialRatio       int
	MaxDelayPenalty uint64 // Maximum delay of a tx recorded at a neighbor in ms

	ObservedTxRatio int

	ShowTxDelivery bool // Controls whether the console prints all txs

	ScreenList []string
	NoPeerList []string
}

func NewPerigeeConfig(path string) (*PerigeeConfig, error) {
	pcfg := &PerigeeConfig{}

	if path == "" {
		pcfg = &PerigeeConfig{
			Active:          false,
			Period:          0,
			ReplaceRatio:    0.,
			MaxDelayPenalty: 0,
			ObservedTxRatio: 0,
			ShowTxDelivery:  false,
			ScreenList:      []string{},
			NoPeerList:      []string{},
		}
	} else {
		file, err := ioutil.ReadFile(path)
		if err != nil {
			return nil, err
		}
		err = json.Unmarshal([]byte(file), pcfg)
		if err != nil {
			return nil, err
		}
	}

	out, err := json.MarshalIndent(pcfg, "  ", "    ")
	if err != nil {
		panic(err)
	}

	log.Info("Perigee config: " + string(out))
	return pcfg, nil
}

func (pcfg PerigeeConfig) IsBanned(id string) bool {
	for _, forbidden := range pcfg.NoPeerList {
		if strings.EqualFold(forbidden, id) {
			return true
		}
	}
	return false
}
