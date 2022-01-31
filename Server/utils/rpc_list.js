var rpc_list = {
    1: "https://rpc.ankr.com/eth",
}

function get_rpc_url(chainId) {
    return rpc_list[chainId];
}

module.exports = get_rpc_url;
