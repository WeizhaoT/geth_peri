i = 0; j = 0; admin.peers.forEach(function (value) { if (value.network.inbound) { i++; } else { j++; } }); console.log("inbound = " + i + ", outbound = " + j)
