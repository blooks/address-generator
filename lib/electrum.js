'use strict';

var _ = require('lodash');
var async = require('async');
var log = require('coyno-log').child({component: 'ElectrumWallet'});

var Wallet = require('./wallet');
var Chain = require('coyno-chain');


var ElectrumWallet = function(doc) {
  if (!(this instanceof ElectrumWallet)) {
    return new ElectrumWallet(doc);
  }

  return _.extend(this, doc);
};
ElectrumWallet.prototype = _.create(Wallet.prototype, {
  'constructor': ElectrumWallet,
  '_super': Wallet.prototype
});


ElectrumWallet.prototype.update = function (callback) {
  log.trace({wallet: this._id}, 'Update Electrum wallet');

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

module.exports = ElectrumWallet;
