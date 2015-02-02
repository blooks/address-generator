'use strict';

var _ = require('lodash');
var async = require('async');
var log = require('coyno-log').child({component: 'DerivationStrategy'});
var Chain = require('coyno-chain');


var DerivationStrategy = function (doc) {
  if (!(this instanceof DerivationStrategy)) {
    return new DerivationStrategy(doc);
  }

  return _.extend(this, doc);
};

DerivationStrategy.prototype.update = function (callback) {
  log.trace({
    type: this.name,
    wallet: this.walletId,
    current: this.current,
    targetBuffer: this.targetBuffer
  }, 'Updating derivations for wallet');

  this.existingAddresses = (this.existingAddresses || []).concat(this.newAddresses || []);
  this.addresses = this.existingAddresses;
  this.newAddresses = [];
  this.transactions = [];

  var addresses = _.pluck(this.addresses, 'address');

  if (addresses.length === 0) {
    this.loop(this.getOrders(), callback);
  }
  else {
    log.trace({count: addresses.length}, 'Fetching transactions for existing addresses');
    var chain = new Chain(this.userId, this._id);

    chain.fetchTransactionsFromAddresses(addresses, function (err, transactions) {
      if (err) {
        return callback(err);
      }

      this.transactions = transactions;
      this.loop(this.getOrders(), callback);
    }.bind(this));
  }
};

DerivationStrategy.prototype.loop = function (orders, callback) {
  log.trace(orders, 'Derivation loop');

  var chain = new Chain(this.userId, this._id);

  async.until(
    function () { return orders.buffer >= this.targetBuffer; }.bind(this),
    function (callback) {
      var quantity = this.targetBuffer - orders.buffer;
      this.deriveBatch(quantity, orders.max, function (err, addresses) {
        if (err) {
          return callback(err);
        }
        this.addresses = _(this.addresses).concat(addresses).uniq('address').value();
        this.newAddresses = _(this.newAddresses).concat(addresses).uniq('address').value();
        chain.fetchTransactionsFromAddresses(_.pluck(addresses, 'address'), function (err, transactions) {
          if (err) {
            return callback(err);
          }

          this.transactions = _(this.transactions).concat(transactions).uniq('foreignId').value();
          orders = this.getOrders();
          callback();
        }.bind(this));
      }.bind(this));
    }.bind(this),
    function (err) {
      if (err) {
        return callback(err);
      }
      return callback(null, {addresses: this.newAddresses, transactions: this.transactions});
    }.bind(this)
  );
};

DerivationStrategy.prototype.deriveBatch = function (size, startingOrder, callback) {
  log.trace({
    size: size,
    startingOrder: startingOrder,
    current: this.current,
    type: this.name
  }, 'Deriving batch');

  var addresses = [];
  var index = 0;

  async.whilst(
    function () { return index < size; },
    function (callback) {
      this.derivationFunction(this.current, this.updateParams, function (err, result) {
        if (err) {
          return callback(err);
        }

        index += result.addresses.length;
        addresses.push(result.addresses);
        this.current = result.current;
        callback(null);
      }.bind(this));
    }.bind(this),
    function (err) {
      if (err) {
        return callback(err);
      }

      addresses = _.flatten(addresses).map(function (address) {
        return {
          address: address,
          order: ++startingOrder
        };
      });

      callback(err, addresses);
    }
  );
};

DerivationStrategy.prototype.getOrders = function() {
  var txAddresses = _(this.transactions).map(function (transaction) {
    var inoutputs = _.union(transaction.details.inputs, transaction.details.outputs);
    return _.pluck(inoutputs, 'note');
  }).flatten().value();

  var maxOrder = _.max(this.addresses, 'order');
  var maxUsedOrder = _.max(this.addresses, function (address) {
    return txAddresses.indexOf(address.address) === -1 ? -Infinity : address.order;
  });

  maxOrder = maxOrder === -Infinity ? 0 : maxOrder.order;
  maxUsedOrder = maxUsedOrder === -Infinity ? 0 : maxUsedOrder.order;

  return {
    max: maxOrder,
    maxUsed: maxUsedOrder,
    buffer: maxOrder - maxUsedOrder
  };
};



module.exports = DerivationStrategy;
