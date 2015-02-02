'use strict';

var _ = require('lodash');
var async = require('async');
var bitcore = require('bitcore');
var Electrum = require('bitcore-electrum');

var log = require('coyno-log').child({component: 'ElectrumWallet'});

var Wallet = require('./wallet');
var DerivationStrategy = require('./derivation-strategy');


var ElectrumWallet = function (doc) {
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

  return async.waterfall([
    this.readAddresses.bind(this),
    this.deriveAddressesAndFetchTransactions.bind(this),
    this.updateTransactions.bind(this),
    this.updateAddresses.bind(this),
    this.updateWalletDetails.bind(this)
  ], callback);
};

ElectrumWallet.prototype.deriveAddressesAndFetchTransactions = function (addresses, callback) {
  log.trace({wallet: this._id}, 'Deriving electrum addresses');

  var biggestIndex = 0;
  if (this.addresses && this.addresses.length > 0) {
    biggestIndex = _.max(this.addresses, 'order');
    biggestIndex = biggestIndex === -Infinity ? 0 : biggestIndex.order;
  }

  var derivationStrategy = new DerivationStrategy({
    name: 'Electrum',
    derivationFunction: ElectrumWallet.prototype.derive.bind(this),
    existingAddresses: this.addresses,
    userId: this.userId,
    walletId: this._id,
    current: biggestIndex,
    updateParams: {
      masterPublicKey: new Electrum(this.hdseed)
    },
    targetBuffer: 200
  });

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

ElectrumWallet.prototype.derive = function (current, params, callback) {
  if (current % 2) {
    return this.derive(current - 1, params, function(err, result) {
      result.addresses = result.addresses.slice(1);
      callback(err, result);
    });
  }

  var key = params.masterPublicKey.generatePubKey(current / 2);
  var addr = bitcore.Address.fromPublicKey(new bitcore.PublicKey(key)).toString();

  var changekey = params.masterPublicKey.generateChangePubKey(current / 2);
  var changeAddr = bitcore.Address.fromPublicKey(new bitcore.PublicKey(changekey)).toString();

  return callback(null, {
    current: current + 2,
    addresses: [addr, changeAddr]
  });
};


module.exports = ElectrumWallet;
