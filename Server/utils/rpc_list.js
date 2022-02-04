var rpc_list = {
    1: "https://rpc.ankr.com/eth",
    4: "https://rinkeby.infura.io/v3/c75f2ce78a4a4b64aa1e9c20316fda3e"
}

function get_rpc_url(chainId) {
    return rpc_list[chainId];
}

module.exports = get_rpc_url;
