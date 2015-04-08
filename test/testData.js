var mongo = require('coyno-mongo');
var async = require('async');

var bitcoinwalletwallet = {
  "_id" : "E2kQargHKujeY442B",
  "label" : "Wallet",
  "type" : "bitcoin-wallet",
  "hdseed" : "xpub69FouPJPQuntZoFnvcTd1eifGCYy8Jxc8hWDbrzFHhQPFWcNaxmC4Mc5SQxiseDHNAifQtrL3AoJmrBWfBfgznecsa5dzcbMrjx3fv6f6dE",
  "userId" : "fX9qJ4c92CwLTZABK",
  "updating" : false,
  "createdAt" : "2015-04-08T13:33:05.608Z",
  "updatedAt" : "2015-04-08T13:33:05.662Z"
};

var exchangeRate = {
  "_id" : "551b2e9d85cf6abb6882a5ab",
  "time" : new Date("2010-07-22T00:00:00.000Z"),
  "rates" : {
    "EUR": 0.0619,
    "GBP": 0.0521,
    "USD": 0.07920000000000001
  }
};


var testDataManager = function() {};

var startMongo = function (callback) {
  mongo.start(function (err, db) {
    if (err) {
      return callback(err);
    }
    return callback(null, db);
  });
};

var createWalletsCollection = function (db, callback) {
  db.createCollection('bitcoinwallets', function (err) {
    return callback(err, db);
  });
};

var createAddressesCollection = function (db, callback) {
  db.createCollection('bitcoinaddresses', function (err) {
    return callback(err, db);
  });
};

var createTransfersCollection = function (db, callback) {
  db.createCollection('transfers', function (err) {
    return callback(err, db);
  });
};
var createExchangeRatesCollection = function (db, callback) {
  db.createCollection('exchangeratesfromnpm', function (err) {
    return callback(err);
  });
};


testDataManager.prototype.initDB = function (callback) {

  if (!process.env.MONGO_URL) {
    return callback(Error('No Mongo URL set'));
  }
  async.waterfall([
    startMongo,
    createWalletsCollection,
    createAddressesCollection,
    createTransfersCollection,
    createExchangeRatesCollection
  ], callback);

};

var insertWallet = function(db) {
  return function(callback) {
    db.collection('bitcoinwallets').insert(bitcoinwalletwallet, function (err, result) {
        callback(err, db);
    });
  }
};
var insertExchangeRate = function(db, callback) {
  db.collection('exchangeratesfromnpm').insert(exchangeRate, callback);
};
testDataManager.prototype.fillDB = function (callback) {
  async.waterfall([
    insertWallet(mongo.db),
    insertExchangeRate
  ], callback);
};

var deleteTransfers = function(db) {
  var collection = db.collection('transfers');
  return function (callback) {
    collection.remove({}, function(err, result) {
      callback(err, db);
    });
  }
};
var deleteAddresses = function (db, callback) {
  var collection = db.collection('bitcoinaddresses');
  collection.remove({}, function(err, result) {
    callback(err, db);
  });
};

testDataManager.prototype.emptyDB = function (callback) {
  async.waterfall([
    deleteTransfers(mongo.db),
    deleteAddresses
  ], callback);
};

var dropWallets = function (db) {
  return function (callback) {
    db.dropCollection('bitcoinwallets', function (err) {
      return callback(err, db);
    });
  }
};

var dropTransfers = function (db, callback) {
  db.dropCollection('transfers', function(err) {
    return callback(err, db);
  });
};

var dropExchangeRates = function (db, callback) {
  db.dropCollection('exchangeratesfromnpm', function(err) {
    return callback(err, db);
  });
};


var dropAddresses = function (db, callback) {
  db.dropCollection('bitcoinaddresses', function(err) {
    return callback(err, db);
  });
};

testDataManager.prototype.closeDB = function (callback) {
  if (mongo.db) {
    async.waterfall([
      dropWallets(mongo.db),
      dropAddresses,
      dropTransfers,
      dropExchangeRates
    ], function (err) {
      if(err) return callback(err);
      mongo.stop(callback);
    }); }
  else {
    return callback && callback("No Db open", null);
  }
};

module.exports = testDataManager;
