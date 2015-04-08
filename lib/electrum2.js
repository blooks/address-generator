'use strict';

var _ = require('lodash');
var BIP32Wallet = require('./bip32');


var Electrum2Wallet = function (doc) {
  if (!(this instanceof Electrum2)) {
    return new Electrum2(doc);
  }

  return _.extend(this, doc);
};
Electrum2Wallet.prototype = _.create(BIP32Wallet.prototype, {
  'constructor': Electrum2Wallet,
  '_super': BIP32Wallet.prototype
});

module.exports = Electrum2Wallet;
