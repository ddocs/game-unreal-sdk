const WalletConnect = require("@walletconnect/client").default;
const QRCodeModal = require("@walletconnect/qrcode-modal");
const { ethers } = require("ethers");
var abi_list = require('../store/abi.js');
var get_rpc_url = require('./rpc_list.js');

class MirageClient {

    constructor() {
        this.connector = null;
        this.uri = null;
        this.accounts = [];
        this.chainId = null;
        this.device_id = null;
        this._provider = null;
        this.abi = null;
        this.redis_client = null;
    }

    get active_account() {
      return this.accounts[0];
    }

    create_connection(session) {

        if(session) {
          // if session, restore it
          var connector = new WalletConnect({
            bridge: "",
            clientMeta: { },
            session: session
          });
          // var connector = new WalletConnect(session);
        } else {
          // Create a new connector
          var connector = new WalletConnect({
            bridge: "https://testbridge.yartu.io/", // "https://bridge.walletconnect.org", // Required
            //qrcodeModal: QRCodeModal,
            clientMeta: {
                description: "Mirage Unreal SDK",
                url: "https://github.com/mirage-xyz",
                icons: [""],
                name: "Mirage Unreal SDK",
            }
          });
        }
      
        // Subscribe to connection events
        connector.on("connect", (error, payload) => {
          if (error) {
            throw error;
          }
      
          console.log('Client Connected ', payload);
          this.connected = true;

          // Get provided accounts and chainId
          this.accounts = payload.params[0].accounts;
          this.chainId = payload.params[0].chainId;
          this._provider = new ethers.providers.JsonRpcProvider(get_rpc_url(this.chainId));
          this.redis_client.set('session_' + this.device_id, JSON.stringify(this.connector.session));
        });
      
        connector.on("session_update", (error, payload) => {
          if (error) {
            throw error;
          }
      
          console.log('session_update ', payload);
      
          // Get updated accounts and chainId
          this.accounts = payload.params[0].accounts;
          this.chainId = payload.params[0].chainId;
          this._provider = new ethers.providers.JsonRpcProvider(get_rpc_url(this.chainId));
        });
      
        connector.on("disconnect", (error, payload) => {
          if (error) {
            throw error;
          }
      
          console.log('disconnected ', payload);
          
          this.uri = null;
          this.connector = null;
          this.chainId = null;
          this.connected = false;
          this.redis_client.delete('session_' + device_id);
          // Delete walletConnector
        });
      
        // Check if connection is already established
        if (!connector.connected) {
            // create new session
            if(session) {
              return connector.connect().then(() => {
                // get uri for QR Code modal
                this.uri = connector.uri;
                this.connector = connector;

                return connector.uri;
              });
            } else {
              return connector.createSession().then(() => {
                // get uri for QR Code modal
                this.uri = connector.uri;
                this.connector = connector;

                return connector.uri;
            });
            }
        } else {
          this.uri = connector.uri;
          this.connector = connector;
          this.connected = true;
          return new Promise((resolve, reject) => {
            resolve("connected");
          });
        }
    }

    call_method(method_name, abi_hash, contract_address, args) {
      const abi = abi_list[abi_hash];
      const contract = new ethers.Contract(contract_address, abi, this._provider);

      const _call = contract[method_name];
      return _call.apply(args);
    }

    prepare_transaction(method_name, abi_hash, contract_address, args) {
      const abi = abi_list[abi_hash];
      const contract = new ethers.Contract(contract_address, abi);

      const _call = contract.populateTransaction[method_name];
      return _call.apply(null, args);
    }

    get_transaction(tx_id) {
      return this._provider.getTransaction(tx_id);
    }
}

module.exports = MirageClient;
