'use strict';

var _ = require('lodash');
var bitcore = require('bitcore');
var Electrum = require('bitcore-electrum');
var config = require('coyno-config');
var Wallet = require('./wallet');


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


ElectrumWallet.prototype.getDerivationStrategyParams = function () {
  return {
    name: 'Electrum',
    derivationFunction: ElectrumWallet.prototype.derive.bind(this),
    updateParams: {
      masterPublicKey: new Electrum(this.hdseed)
    },
    targetBuffer: config.wallets.buffers.electrum || config.wallets.buffers.base
  };
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
