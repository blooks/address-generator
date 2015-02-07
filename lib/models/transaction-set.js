'use strict';

var _ = require('lodash');
var async = require('async');
var log = require('coyno-log').child({component: 'TransactionSet'});
var mongo = require('coyno-mongo');
var randomId = require('coyno-util').meteor.randomId;
var Coynverter = require('coyno-converter');
var config = require('coyno-config');
var coynverter = new Coynverter(config.mongo.url);

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

  async.waterfall([
    this.getAddressesMapping.bind(this),
    this.connectNodes.bind(this),
    this.updateAttributes.bind(this)
  ], function (err) {
    callback(err, this.transactions);
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

TransactionSet.prototype.connectNodes = function (addressesMapping, callback) {
  async.each(this.transactions, function (transaction, callback) {
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
    callback();
  }.bind(this), callback);
};



function mapWalletInfo(inoutput, callback) {
  mongo.db.collection('bitcoinaddresses').findOne({_id: inoutput.nodeId}, function (err, doc) {
    if (err || !doc) {
      return callback(err, inoutput);
    }
    mongo.db.collection('bitcoinwallets').findOne({_id: doc.walletId}, function (err, doc) {
      if (err || !doc) {
        return callback(err, inoutput);
      }

      callback(null, _.extend({}, inoutput, {wallet: {id: doc._id, label: doc.label}}));
    });
  });
}

function updateInOutputs(transaction, callback) {
  async.parallel({
    inputs: function (callback) {
      async.map(transaction.details.inputs, mapWalletInfo, callback);
    },
    outputs: function (callback) {
      async.map(transaction.details.outputs, mapWalletInfo, callback);
    }
  }, callback);
}

function sumAmountReduce(total, inoutput) {
  return total + inoutput.amount;
}


TransactionSet.prototype.updateAttributes = function (callback) {
  async.eachSeries(this.transactions, function (transaction, callback) {
    transaction.updatedAt = this.date;
    transaction.createdAt = this.date;

    updateInOutputs(transaction, function (err, details) {
      if (err) {
        return callback(err);
      }

      //TODO: check the reasoning behind those with multiple sources (coin mix)

      var senderNode = (_(details.inputs).filter('wallet').first() || {}).wallet;
      var recipientNode = (_(details.outputs).filter(function (output) {
        return output.wallet && output.wallet.id !== (senderNode && senderNode.id);
      }).first() || {}).wallet;

      var inputsValue = _.reduce(transaction.details.inputs, sumAmountReduce, 0);
      var outputsValue = _.reduce(transaction.details.outputs, sumAmountReduce, 0);
      var amount = details.outputs.reduce(function (total, output) {
        if ((!senderNode && !output.wallet) ||
          (senderNode && output.wallet && output.wallet.id === senderNode.id)) {
          return total;
        }
        else {
          return total + output.amount;
        }
      }, 0);

      // all inputs and outputs are from user wallet
      if (senderNode && !recipientNode &&
        _.filter(details.inputs, 'wallet').length === details.inputs.length &&
        _.filter(details.outputs, 'wallet').length === details.outputs.length) {

        recipientNode = details.outputs[0].wallet;
        amount = outputsValue;
      }

      transaction.representation = {
        fee: inputsValue - outputsValue,
        senderLabels: [senderNode ? senderNode.label : 'External'],
        recipientLabels: [recipientNode ? recipientNode.label : 'External'],
        type: senderNode ?
          (recipientNode ? 'internal' : 'outgoing') :
          (recipientNode ? 'incoming' : 'orphaned'),
        amount: amount
      };

      var date = new Date(this.date);
      async.mapSeries(['EUR', 'USD'], function (currency, callback) {
        coynverter.convert('BTC', currency, amount, date, function (err, resp) {
          var exchangeRate = {};
          exchangeRate[currency] = Math.round(resp);
          callback(null, exchangeRate);
        });
      }.bind(this), function(err, baseVolume) {
        if (err) {
          return callback(err);
        }

        transaction.baseVolume = baseVolume;

        callback();
      });
    }.bind(this));
  }.bind(this), callback);
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
          updatedAt: transaction.updatedAt,
          representation: transaction.representation,
          baseVolume: transaction.baseVolume
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
