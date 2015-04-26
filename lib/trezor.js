'use strict';

var _ = require('lodash');
var BIP32Wallet = require('./bip32');


var TrezorWallet = function (doc) {
  if (!(this instanceof TrezorWallet)) {
    return new TrezorWallet(doc);
  }

  return _.extend(this, doc);
};
TrezorWallet.prototype = _.create(BIP32Wallet.prototype, {
  'constructor': TrezorWallet,
  '_super': BIP32Wallet.prototype
});

module.exports = TrezorWallet;
