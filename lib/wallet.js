'use strict';

var _ = require('lodash');
var async = require('async');
var log = require('coyno-log').child({component: 'Wallet'});
var mongo = require('coyno-mongo');
var config = require('coyno-config');

var TrasactionSet = require('./models').TrasactionSet;
var randomId = require('coyno-util').meteor.randomId;

var DerivationStrategy = require('./derivation-strategy');

var Wallet = function (doc) {
  if (!(this instanceof Wallet)) {
    return new Wallet(doc);
  }

  return _.extend(this, doc);
};

Wallet.prototype.readAddresses = function (callback) {
  log.trace({wallet: this._id}, 'Read addresses from wallet');

  mongo.db.collection('bitcoinaddresses')
    .find({userId: this.userId, walletId: this._id}).toArray(function (err, addresses) {
      if (err) {
        return callback(err);
      }

      this.addresses = addresses;
      this.addressesArray = _.pluck(addresses, 'address');

      callback(null, this.addressesArray);
    }.bind(this)
  );
};

Wallet.prototype.updateTransactions = function (transactions, callback) {
  log.trace({wallet: this._id, count: transactions.length}, 'Update transactions from wallet');

  var transactionSet = new TrasactionSet(this.addressesArray, transactions, this.userId, this._id);
  transactionSet.updateTransactions(callback);
};


var updateAddress = function (address, callback) {

  mongo.db.collection('transfers').find({
    $or: [
      {'details.inputs': {$elemMatch: {'nodeId': address._id}}},
      {'details.outputs': {$elemMatch: {'nodeId': address._id}}}
    ]
  }).toArray(function (err, transactions) {
    if (err) {
      return callback(err);
    }

    var balance = transactions.reduce(function (total, transaction) {
      return total -
        transaction.details.inputs.reduce(function (total, input) {
          return input.nodeId === address._id ? total + input.amount : total;
        }, 0) +
        transaction.details.outputs.reduce(function (total, output) {
          return output.nodeId === address._id ? total + output.amount : total;
        }, 0);
    }, 0);

    if (balance === address.balance) {
      return callback();
    }

    mongo.db.collection('bitcoinaddresses').update({_id: address._id}, {
      $set: {balance: balance}
    }, function (err) {
      callback(err);
    });
  });
};

Wallet.prototype.updateAddresses = function (callback) {
  log.trace({wallet: this._id}, 'Update addresses from wallet');

  async.each(this.addresses, updateAddress, callback);
};

Wallet.prototype.updateWalletDetails = function (callback) {
  log.trace({wallet: this._id}, 'Update details from wallet');


  mongo.db.collection('users').update({_id: this.userId}, {
    $set: {'profile.hasTransfers': true}
  }, function (err) { callback(err); });
};


Wallet.prototype.saveAddresses = function(addresses, callback) {
  log.debug({wallet: this._id, count: addresses.length}, 'Save addresses');

  var now = new Date();
  addresses = addresses.map(function (address) {
    return _.extend(address, {
      _id: randomId(),
      userId: this.userId,
      walletId: this._id,
      balance: 0,
      createdAt: now,
      updatedAt: now
    });
  }.bind(this));

  mongo.db.collection('bitcoinaddresses').insertMany(addresses, function (err) {
    callback(err, addresses);
  });
};
Wallet.prototype.setWalletToUpdated = function (callback) {
  log.trace({wallet: this._id}, 'Unsetting updating flag for wallet');
  mongo.db.collection('bitcoinwallets').update({_id : this._id}, {$set : {updating: false}}, function (err) {
    callback(err);
  });
};

Wallet.prototype.update = function (callback) {
  log.trace({wallet: this._id}, 'Update wallet');
  return async.waterfall([
    this.readAddresses.bind(this),
    this.deriveAddressesAndFetchTransactions.bind(this),
    this.updateTransactions.bind(this),
    this.updateAddresses.bind(this),
    this.updateWalletDetails.bind(this)
  ], function (error) {
    this.setWalletToUpdated(function(err) {
      if (error) {
        return callback(error);
      }
      return callback(err);
    })
  }.bind(this));
};

Wallet.prototype.deriveAddressesAndFetchTransactions = function (addresses, callback) {
  log.trace({wallet: this._id}, 'Deriving addresses');

  var params = this.getDerivationStrategyParams && this.getDerivationStrategyParams() || {};

  var biggestIndex = 0;
  if (this.addresses && this.addresses.length > 0) {
    biggestIndex = _.max(this.addresses, 'order');
    biggestIndex = biggestIndex === -Infinity ? 0 : biggestIndex.order;
  }

  var derivationStrategy = new DerivationStrategy(_.extend({
    existingAddresses: this.addresses,
    userId: this.userId,
    walletId: this._id,
    current: biggestIndex,
    updateParams: { },
    targetBuffer: config.wallets.buffers.base
  }, params));

  derivationStrategy.update(function (err, result) {
    if (err) {
      return callback(err);
    }

    if (result.addresses && result.addresses.length > 0) {
      this.saveAddresses(result.addresses, function (err, addresses) {
        if (err) {
          return callback(err);
        }

        this.addresses = this.addresses.concat(addresses);
        return callback(null, result.transactions);
      }.bind(this));
    }
    else {
      return callback(null, result.transactions);
    }
  }.bind(this));
};


module.exports = Wallet;
