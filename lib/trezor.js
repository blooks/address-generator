'use strict';

var _ = require('lodash');
var bitcore = require('bitcore');
var config = require('coyno-config');
var Wallet = require('./wallet');


var TrezorWallet = function (doc) {
  if (!(this instanceof TrezorWallet)) {
    return new TrezorWallet(doc);
  }

  return _.extend(this, doc);
};
TrezorWallet.prototype = _.create(Wallet.prototype, {
  'constructor': TrezorWallet,
  '_super': Wallet.prototype
});


TrezorWallet.prototype.getDerivationStrategyParams = function () {
  return {
    name: 'Trezor',
    derivationFunction: TrezorWallet.prototype.derive.bind(this),
    updateParams: {
      masterPublicKey: new bitcore.HDPublicKey(this.hdseed)
    },
    targetBuffer: config.wallets.buffers.trezor || config.wallets.buffers.base
  };
};

TrezorWallet.prototype.derive = function (current, params, callback) {
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


module.exports = TrezorWallet;
