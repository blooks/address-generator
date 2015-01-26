'use strict';

var _ = require('lodash');
var async = require('async');
var log = require('coyno-log').child({component: 'Wallet'});
var mongo = require('coyno-mongo');

var TrasactionSet = require('./models').TrasactionSet;

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
      this.addressesArray = addresses.map(function (item) {
        return item.address;
      });

      if (addresses.length === 0) {
        return callback(null);
      }

      callback(null, this.addressesArray);
    }.bind(this)
  );
};

Wallet.prototype.updateTransactions = function (transactions, callback) {
  log.trace({wallet: this._id, count: transactions.length}, 'Update transactions from wallet');

  var transactionSet = new TrasactionSet(this.addressesArray, transactions, this.userId, this._id);
  transactionSet.updateTransactions(callback);

  //TODO: update representation

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

module.exports = Wallet;
