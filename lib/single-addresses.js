'use strict';

var _ = require('lodash');
var async = require('async');
var log = require('coyno-log').child({component: 'SingleAddressesWallet'});

var Wallet = require('./wallet');
var Chain = require('coyno-chain');


var SingleAddressesWallet = function (doc) {
  if (!(this instanceof SingleAddressesWallet)) {
    return new SingleAddressesWallet(doc);
  }

  return _.extend(this, doc);
};
SingleAddressesWallet.prototype = _.create(Wallet.prototype, {
  'constructor': SingleAddressesWallet,
  '_super': Wallet.prototype
});


SingleAddressesWallet.prototype.update = function (callback) {
  log.trace({wallet: this._id}, 'Update Single Addresses wallet');

  var chain = new Chain(this.userId, this._id);

  return async.waterfall([
    this.readAddresses.bind(this),
    chain.fetchTransactionsFromAddresses.bind(chain),
    this.updateTransactions.bind(this),
    this.updateAddresses.bind(this),
    this.updateWalletDetails.bind(this)
  ], callback);
};

SingleAddressesWallet.prototype.insert = function (addresses, callback) {
  log.trace({wallet: this._id}, 'Insert addresses into wallet');
  //save addresses
  //if update all:
  //addresses = read all addresses
  //chain api for addresses ....

  //set callback to update balances, etc
  callback();
};

SingleAddressesWallet.prototype.remove = function (addresses, callback) {
  log.trace({wallet: this._id}, 'Remove addresses from wallet');
  //remove addresses
  //remove transactions with addresses

  //set callback to update balances, etc
  callback();
};

module.exports = SingleAddressesWallet;
