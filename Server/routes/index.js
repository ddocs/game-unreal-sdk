var express = require('express');
var package = require('../package.json');
var router = express.Router();
var crypto = require('crypto');

var connection_list = require('../store/connection.js');
var device_list = require('../store/device.js');
var abi_list = require('../store/abi.js');
var MirageClient = require('../utils/client');

function is_json(str) {

  try {
      return (JSON.parse(str) && !!str);
  } catch (e) {
      return false;
  }
}

/* GET home page. */
router.get('/', function(req, res, next) {

  res.json({ server: 'Mirage Unreal SDK', version: package.version });
});

/* GET ping. */
router.get('/ping', function(req, res, next) {

  res.json({ result: 'pong' });
});

/* POST connect */
router.post('/connect', function(req, res, next) {

  // TODO: get device id and prevent multiple sessions for device
  const device_id = req.body.device_id;
  if(!device_id) {
    res.json({ result: false });
    return
  }

  var client = device_list[device_id];

  if (!client) {
    client = new MirageClient();
  }

  if(!client.connected) {
    client.createConnection().then((client_uri) => {
      let session_id = client_uri.split("?")[0];
      connection_list[session_id] = client;
      device_list[device_id] = client;
      res.json({ result: true, uri: client_uri, session: session_id });
    }, () => {
      res.json({ result: false });
    });
  } else {
    const session_id = client.uri.split("?")[0];
    res.json({ result: true, uri: client.uri, session: session_id }); 
  }
});

router.post('/abi', function(req, res, next) {

  const abi = req.body.abi.replace(' ', '').replace('\n', '');;
  const hash = req.body.hash;
  if (is_json(abi)) {
    const abi_hash = crypto.createHash('sha256').update(abi).digest('hex');
    abi_list[abi_hash] = abi;
    res.json({ result: true, abi: abi_hash });

  } else {
    res.json({ result: false });
  }
});

router.post('/get/transaction', function(req, res, next) {

  const device_id = req.body.device_id;
  const tx_id = req.body.tx_id;
  const client = device_list[device_id];

  if(client && !client.connected) {

    let result = client.get_transaction(tx_id);

    result.then((data) => {
      if(data === null) {
        res.json({ result: false, msg: "Transaction not found" });
      } else {
        res.json({ result: true, data: data });
      }
      
    }, (err) => {
      res.json({ result: false });
    });
  } else {
    res.json({ result: false });
  }
});

router.post('/call/method', function(req, res, next) {

  const device_id = req.body.device_id;
  const contract_address = req.body.contract_address;
  const method = req.body.method;
  const args = req.body.args;
  const abi_hash = req.body.abi_hash;

  const client = device_list[device_id];

  if(client && client.connected) {

    let result = client.call_method(method, abi_hash, contract_address, args);

    result.then((data) => {
      res.json({ result: true, data: data.toString() });
    }, (err) => {
      res.json({ result: false });
    });
  } else {
    res.json({ result: false });
  }
});


router.post('/send/transaction', function(req, res, next) {

  const device_id = req.body.device_id;
  const contract_address = req.body.contract_address;
  const method = req.body.method;
  const args = req.body.args;
  const abi_hash = req.body.abi_hash;

  const client = device_list[device_id];

  if(client && client.connected) {

    let raw_transaction = client.send_transaction(method, abi_hash, contract_address, args);

    raw_transaction.then((tx) => {
      tx.from = client.active_account;
      client.connector.sendTransaction(tx).then((data) => {
        res.json({ result: true, data: data.toString() });
      }).catch((err) => {
        // Error returned when rejected
        res.json({ result: false, msg: err });
      });
    });
  } else {
    res.json({ result: false });
  }
});

module.exports = router;
