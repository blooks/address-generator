'use strict';

var _ = require('lodash');
var async = require('async');
var log = require('coyno-log').child({component: 'TransactionSet'});
var mongo = require('coyno-mongo');
var randomId = require('coyno-util').meteor.randomId;

var TransactionSet = function (addresses, transactions, userId, walletId) {
  if (!(this instanceof TransactionSet)) {
    return new TransactionSet(addresses, transactions, userId, walletId);
  }

  this.addresses = addresses;
  this.transactions = transactions;
  this.userId = userId;
  this.walletId = walletId;
  this.date = new Date();
  this.affectedAddresses = [];
  this.existingTransactionIds = [];

  log.trace({
    transactions: this.transactions.length,
    addresses: this.addresses.length,
    wallet: walletId
  }, 'Created transaction set');
};

TransactionSet.prototype.updateTransactions = function (callback) {
  log.trace('Update transaction set');

  async.series([
    this.updateTransactionInfo.bind(this),
    this.updateExistingTransactions.bind(this),
    this.insertNewTransactions.bind(this)
  ], function (err) {
    callback(err);
  });

  //TODO: update representation

};

TransactionSet.prototype.updateTransactionInfo = function (callback) {
  this.affectedAddresses = _(this.transactions).invoke(function () {
    return _([this.details.inputs, this.details.outputs])
      .flatten(true)
      .pluck('note')
      .valueOf();
  })
    .flatten()
    .uniq()
    .valueOf();

  this.getAddressesMapping(function (err, addressesMapping) {
    if (err) {
      callback(err);
    }

    this.connectNodes(addressesMapping);

    callback(null, this.transactions);
  }.bind(this));
};

TransactionSet.prototype.getAddressesMapping = function (callback) {
  return mongo.db.collection('bitcoinaddresses').find({
    $and: [
      {userId: this.userId},
      {address: {$in: this.affectedAddresses}}
    ]
  }, {address: 1}).toArray(function (err, addresses) {
    if (err) {
      return callback(err);
    }

    if (addresses.length > 0) {
      log.trace({
        wallet: this.walletId,
        count: addresses.length
      }, 'Addresses already into a wallet');
    }

    var map = _.zipObject(_.pluck(addresses, 'address'), _.pluck(addresses, '_id'));

    return callback(null, map);
  }.bind(this));
};

TransactionSet.prototype.connectNodes = function (addressesMapping) {
  this.transactions.forEach(function (transaction) {
    transaction.details.inputs.forEach(function (input) {
      if (addressesMapping[input.note]) {
        input.nodeId = addressesMapping[input.note];
      }
    });
    transaction.details.outputs.forEach(function (output) {
      if (addressesMapping[output.note]) {
        output.nodeId = addressesMapping[output.note];
      }
    });
    transaction.updatedAt = this.date;
    transaction.createdAt = this.date;
    transaction.connected = false;
  }.bind(this));
};

TransactionSet.prototype.updateExistingTransactions = function (callback) {
  var collection = mongo.db.collection('transfers');

  async.map(this.transactions, function (transaction, callback) {
    collection.findAndModify(
      {foreignId: transaction.foreignId},
      null,
      {
        $set: {
          'details.inputs': transaction.details.inputs,
          'details.outputs': transaction.details.outputs,
          'updatedAt': transaction.updatedAt,
          'connected': false
        }
      },
      {new: true}, function (err, doc) {
        if (err) {
          return callback(err);
        }
        else if (doc.value) {
          this.existingTransactionIds.push(doc.value.foreignId);
        }

        callback();
      }.bind(this)
    );
  }.bind(this), callback);
};

TransactionSet.prototype.insertNewTransactions = function (callback) {
  var newTransactions = this.transactions.filter(function (transaction) {
    if (this.existingTransactionIds.indexOf(transaction.foreignId) === -1) {
      transaction._id = randomId();
      transaction.connected = false;
      return true;
    }
    return false;
  }.bind(this));

  if (newTransactions.length === 0) {
    return callback(null);
  }

  mongo.db.collection('transfers').insertMany(newTransactions, function (err) {
    callback(err);
  });
};

module.exports = TransactionSet;
