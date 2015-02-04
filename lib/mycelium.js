'use strict';

var _ = require('lodash');
var bitcore = require('bitcore');
var config = require('coyno-config');
var Wallet = require('./wallet');


var MyceliumWallet = function (doc) {
  if (!(this instanceof MyceliumWallet)) {
    return new MyceliumWallet(doc);
  }

  return _.extend(this, doc);
};
MyceliumWallet.prototype = _.create(Wallet.prototype, {
  'constructor': MyceliumWallet,
  '_super': Wallet.prototype
});


MyceliumWallet.prototype.getDerivationStrategyParams = function () {
  return {
    name: 'Mycelium',
    derivationFunction: MyceliumWallet.prototype.derive.bind(this),
    updateParams: {
      masterPublicKey: new bitcore.HDPublicKey(this.hdseed)
    },
    targetBuffer: config.wallets.buffers.mycelium || config.wallets.buffers.base
  };
};

MyceliumWallet.prototype.derive = function (current, params, callback) {
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


module.exports = MyceliumWallet;
