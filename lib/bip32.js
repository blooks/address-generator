'use strict';

var _ = require('lodash');
var async = require('async');
var log = require('coyno-log').child({component: 'BIP32Wallet'});

var Wallet = require('./wallet');
var Chain = require('coyno-chain');


var BIP32Wallet = function(doc) {
  if (!(this instanceof BIP32Wallet)) {
    return new BIP32Wallet(doc);
  }

  return _.extend(this, doc);
};
BIP32Wallet.prototype = _.create(Wallet.prototype, {
  'constructor': BIP32Wallet,
  '_super': Wallet.prototype
});


BIP32Wallet.prototype.update = function (callback) {
  log.trace({wallet: this._id}, 'Update BIP32 wallet');

  var chain = new Chain(this.userId, this._id);

  //TODO: implement incremental derivation

  return async.waterfall([
    this.readAddresses.bind(this),
    chain.fetchTransactionsFromAddresses.bind(chain),
    this.updateTransactions.bind(this),
    this.updateAddresses.bind(this),
    this.updateWalletDetails.bind(this)
  ], callback);
};

module.exports = BIP32Wallet;
