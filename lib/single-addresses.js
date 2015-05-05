'use strict';

var _ = require('lodash');
var log = require('coyno-log').child({component: 'SingleAddressesWallet'});

var Wallet = require('./wallet');

var SingleAddressesWallet = function (doc) {
  if (!(this instanceof SingleAddressesWallet)) {
    return new SingleAddressesWallet(doc);
  }

  return _.extend(this, doc);
};
SingleAddressesWallet.prototype = _.create(Wallet.prototype, {
  'constructor': SingleAddressesWallet,
  '_super': Wallet.prototype
});

SingleAddressesWallet.prototype.deriveAddresses = function (callback) {
  log.debug('Deriving Addresses for single address wallet. Nothing to do.');
  return callback(null);
};



module.exports = SingleAddressesWallet;
