'use strict';

var _ = require('lodash');
var bitcore = require('bitcore');
var config = require('coyno-config');
var Wallet = require('./wallet');


var BIP32Wallet = function (doc) {
  if (!(this instanceof BIP32Wallet)) {
    return new BIP32Wallet(doc);
  }

  return _.extend(this, doc);
};
BIP32Wallet.prototype = _.create(Wallet.prototype, {
  'constructor': BIP32Wallet,
  '_super': Wallet.prototype
});


BIP32Wallet.prototype.getDerivationStrategyParams = function () {
  return {
    name: 'BIP32',
    derivationFunction: BIP32Wallet.prototype.derive.bind(this),
    updateParams: {
      masterPublicKey: new bitcore.HDPublicKey(this.hdseed)
    },
    targetBuffer: config.wallets.buffers.bip32 || config.wallets.buffers.base
  };
};

BIP32Wallet.prototype.derive = function (current, params, callback) {
  if (current % 2) {
    return this.derive(current - 1, params, function(err, result) {
      result.addresses = result.addresses.slice(1);
      callback(err, result);
    });
  }

  var key = params.masterPublicKey.derive('m/0/' + (current / 2).toString()).publicKey;
  var addr = bitcore.Address.fromPublicKey(key).toString();

  var changeKey = params.masterPublicKey.derive('m/1/' + (current / 2).toString()).publicKey;
  var changeAddr = bitcore.Address.fromPublicKey(changeKey).toString();

  return callback(null, {
    current: current + 2,
    addresses: [addr, changeAddr]
  });
};


module.exports = BIP32Wallet;
