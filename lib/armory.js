'use strict';

var _ = require('lodash');
var Wallet = require('./wallet');
var armory = require('bitcore-armory');


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


ArmoryWallet.prototype.getDerivationStrategyParams = function () {
  return {
    name: 'Armory',
    derivationFunction: ArmoryWallet.prototype.derive.bind(this),
    updateParams: {
      rootPublicKey: new armory.ArmoryRootPublicKey(this.hdseed.id, this.hdseed.data)
    }
  };
};

ArmoryWallet.prototype.derive = function (current, params, callback) {
  var key = params.rootPublicKey.derive(current);
  var addr = key.toAddress().toString();

  return callback(null, {
    current: current + 1,
    addresses: [addr]
  });
};

module.exports = ArmoryWallet;
