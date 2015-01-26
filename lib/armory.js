'use strict';

var _ = require('lodash');
var async = require('async');
var log = require('coyno-log').child({component: 'ArmoryWallet'});

var Wallet = require('./wallet');
var Chain = require('coyno-chain');


var ArmoryWallet = function (doc) {
  if (!(this instanceof ArmoryWallet)) {
    return new ArmoryWallet(doc);
  }

  return _.extend(this, doc);
};
ArmoryWallet.prototype = _.create(Wallet.prototype, {
  'constructor': ArmoryWallet,
  '_super': Wallet.prototype
});


ArmoryWallet.prototype.update = function (callback) {
  log.trace({wallet: this._id}, 'Update Armory wallet');

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

module.exports = ArmoryWallet;
