var express = require('express');
var package = require('../package.json');
var router = express.Router();
var crypto = require('crypto');
var uuid4 = require('uuid')
var redis = require('redis');

var device_list = require('../store/device.js');
var abi_list = require('../store/abi.js');
var MirageClient = require('../utils/client');

var redis_client = redis.createClient();
redis_client.connect();
redis_client.ping();

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
router.post('/connect', async function(req, res, next) {

  // TODO: get device id and prevent multiple sessions for device
  const device_id = req.body.device_id;
  if(!device_id) {
    res.json({ result: false });
    return
  }

  var client = device_list[device_id];

  if (!client) {
    client = new MirageClient();
    client.device_id = device_id;
    client.redis_client = redis_client;
  }

  if(!client.connected) {
    try {
      var last_session = JSON.parse(await redis_client.get('session_' + device_id));
    } catch {
      var last_session = false;
    }

    client.create_connection(last_session).then((client_uri) => {
      let session_id = client_uri.split("?")[0];
      device_list[device_id] = client;
      res.json({ result: true, uri: client_uri, session: session_id });
    }, (err) => {
      console.log(err);
      res.json({ result: false });
    });
  } else {
    res.json({ result: false, msg: 'Client already connected', code: 1001 }); 
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

  // Create ticket for request and set status as waiting
  const ticket = uuid4.v4();
  redis_client.set('ticket_' + ticket, {status: 'waiting', code: 0 }, function (err, res) { });

  const device_id = req.body.device_id;
  const contract_address = req.body.contract_address;
  const method = req.body.method;
  const args = req.body.args;
  const abi_hash = req.body.abi_hash;

  const client = device_list[device_id];

  if(client && client.connected) {

    let raw_transaction = client.prepare_transaction(method, abi_hash, contract_address, args.split(','));

    raw_transaction.then((tx) => {
      tx.from = client.active_account;
      client.connector.sendTransaction(tx).then((data) => {
        console.log(data);
        data.status = 'success';
        data.code = 1;
        redis_client.set('ticket_' + ticket, data, function (err, res) { });
      }).catch((err) => {
        let data = {};
        data.status = 'rejected';
        data.code = -1;
        redis_client.set('ticket_' + ticket, data, function (err, res) { });
      });
      res.json({ result: true, ticket: ticket });
    });

  } else {
    res.json({ result: false, msg: 'No Client Found', code: 1000 });
  }
});

router.post('/result', function(req, res, next) {
  const ticket = req.body.ticket;

  const data = redis_client.get('ticket_' + ticket);
  
  if(data) {
    ret.json({ result: true, data: data })
  } else {
    res.json({ result: false, msg: 'No Ticket Found', code: 2000 });
  }

});

router.post('/get/changes', function(req, res, next) {

  // TODO: be implemented
  res.json({ result: false });
});

router.post('/force/chain', function(req, res, next) {
  const device_id = req.body.device_id;
  const client = device_list[device_id];

  if(client && client.connected) {
    client.connector.updateChain({chainId: 4});
  }

});

module.exports = router;
