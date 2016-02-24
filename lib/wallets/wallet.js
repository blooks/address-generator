'use strict';

var _ = require('lodash');
var async = require('async');
var log = require('coyno-log').child({component: 'Wallet'});
var randomId = require('coyno-util').meteor.randomId;
var mongo = require('coyno-mongo');
var Dispatcher = require('coyno-dispatcher');


require('../../config');
var bufferSize = process.env.ADDRESS_BUFFER_SIZE;

var Wallet = function (doc) {
  if (!(this instanceof Wallet)) {
    return new Wallet(doc);
  }
  return _.extend(this, doc);
};




Wallet.prototype._loadDerivationParams = function(callback) {
  this.derivationParams = this.derivationParams || {};
  log.debug({wallet: this}, "Derivation params");
  if (!this.derivationParams.change || !this.derivationParams.change.lastDerived) {
    this.derivationParams = _.extend(this.derivationParams, {
      change: {
        lastDerived: 0
      }
    });
    if (!this.derivationParams.change.lastUsed) {
      this.derivationParams.change.lastUsed = 0;
    }
  }
  if (!this.derivationParams.main || !this.derivationParams.main.lastDerived) {
    this.derivationParams = _.extend(this.derivationParams, {
      main: {
        lastDerived: 0
      }
    });
    if (!this.derivationParams.main.lastUsed) {
      this.derivationParams.main.lastUsed = 0;
    }
  }
  if (this.complete) {
    this.derivationParams.main.lastDerived = 0;
    this.derivationParams.change.lastDerived = 0;
  }
  callback();
};

Wallet.prototype._metaData = function() {
  var now = new Date();
  return {
    _id: randomId(),
    userId: this.userId,
    walletId: this._id,
    balance: 0,
    createdAt: now,
    updatedAt: now
  };
};



Wallet.prototype._saveAddresses = function (addresses, callback) {
  var self = this;
  addresses = _.map(addresses, function(address) {
    return _.extend(address, self._metaData());
  });
  log.debug({numAddresses: addresses.length}, "Saving addresses to db.");
  var addressesCollection = mongo.db.collection('bitcoinaddresses');
  var bulk = addressesCollection.initializeUnorderedBulkOp();
  if (addresses.length > 0) {
    addresses.forEach(function(address) {
      bulk.insert(address);
    });
    return bulk.execute(function(err) {
      if (err) {
        if (err.code === 11000) {
          log.debug('Some addresses were already in the db.');
        } else {
          return callback(err);
        }
      }
      var addressStrings = _.pluck(addresses, 'address');
      var addressStringsChunks = _.chunk(addressStrings, 100);
      _.forEach(addressStringsChunks, function(addressChunk) {
        Dispatcher.addresses.fetchTransactions({addresses: addressChunk, userId: self.userId, walletId: self._id});
        });
      callback();
    });
  }
  log.warn({wallet: this._id}, 'No Addresses generated for wallet!');
  return callback();
};



Wallet.prototype._updateSingleAddresses = function (callback) {
  var self = this;
  return mongo.db.collection('bitcoinaddresses').find({ walletId: self._id, userId: self.userId, order: -1 }).
  toArray(function(err, addresses) {
    if (err) {
      return callback(err);
    }
    var addressStrings = _.map(addresses, function(address) {
      return address.address;
    });
    log.debug({
      addresses: addressStrings
    }, 'Dispatching updates for single addresses');
    Dispatcher.addresses.fetchTransactions({addresses: addressStrings, userId: self.userId, walletId: self._id});
    return callback();
  });
};

Wallet.prototype._saveDerivationParams = function(callback) {
  var walletCollection = mongo.db.collection('bitcoinwallets');
  log.debug({derivationParams: this.derivationParams}, 'Saving derivation params');
  walletCollection.update({_id: this._id}, {$set : { 'derivationParams': this.derivationParams}}, callback)
};

Wallet.prototype.update = function (complete, callback) {
  var self = this;
  log.trace({wallet: this._id}, 'Update wallet');

  this.complete = complete;
  async.series([
  this._loadDerivationParams.bind(this),
  this.deriveAddresses.bind(this),
  this._saveDerivationParams.bind(this)
  ],function(err) {
    if (err) {
      log.error({
        error: err
      }, 'Wallet update failed');
      return callback(err);
    }
    if (complete) {
      return self._updateSingleAddresses(callback);
    } else {
      return callback(null);
    }
  }.bind(this));
};

Wallet.prototype.remove = function (callback) {
  log.trace({wallet: this._id}, 'Remove addresses from wallet');
  callback();
};


Wallet.prototype.deriveAddresses = function (callback) {
  var self = this;
  log.debug({type: this.type}, 'Deriving Addresses for Wallet (version 1)');
  var derivationParams = self.derivationParams;
  //TODO: Check whether we have an overlap here. So long better save than sorry.
  var startIndexMain = parseInt(derivationParams.main.lastDerived, 10) ;
  var endIndexMain = parseInt(derivationParams.main.lastUsed, 10)  + parseInt(bufferSize, 10);
  //TODO: Same as above.
  var startIndexChange = parseInt(derivationParams.change.lastDerived, 10);
  var endIndexChange = parseInt(derivationParams.change.lastUsed, 10)  + parseInt(bufferSize, 10);
  //Update last derived address index for both chains.
  this.derivationParams.change.lastDerived = parseInt(endIndexChange);
  this.derivationParams.main.lastDerived = parseInt(endIndexMain);
  async.parallel([
    self._derive(startIndexMain, endIndexMain, 'main').bind(this),
    self._derive(startIndexChange, endIndexChange, 'change').bind(this)
  ], function(err, results) {
    if (err) {
      return callback(err);
    }
    results = _.flatten(results);
    results = _.filter(results, function(result) {
      return (result !== undefined);
    });
    self._saveAddresses(results, callback);
  });
};


module.exports = Wallet;
