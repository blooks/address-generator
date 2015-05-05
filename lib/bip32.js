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

BIP32Wallet.prototype.derive =


module.exports = BIP32Wallet;
