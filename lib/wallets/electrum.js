'use strict';

var _ = require('lodash');
var bitcore = require('bitcore');
var Electrum = require('bitcore-electrum');
var Wallet = require('./wallet');
var log = require('coyno-log').child({component: 'Electrum Wallet'});
var async = require('async');

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


ElectrumWallet.prototype._derive = function (startIndex, endIndex, chain) {
  return function (callback) {
    var masterPublicKey = new Electrum(this.hdseed);
    var index = startIndex;
    var addresses = [];
    var batchSize = Math.max(0, endIndex - startIndex);
    log.debug('Deriving ' + batchSize + ' Addresses');
    async.whilst(function() {
        return index < endIndex;
      },
      function(cb) {
        var address = {
          derivationParams : {
            'chain': chain,
            'order': index
          }
        };
        switch (chain) {
          case 'main':
            var key = masterPublicKey.generatePubKey(index);
            address.address = bitcore.Address.fromPublicKey(new bitcore.PublicKey(key)).toString();
            break;
          case 'change':
            var changekey = masterPublicKey.generateChangePubKey(index);
            address.address = bitcore.Address.fromPublicKey(new bitcore.PublicKey(changekey)).toString();
            break;
        }
        addresses.push(address);
        ++index;
        return cb();
      },
      function(err) {
        if (err) {
          return callback(err);
        }
        return callback(null, addresses);
      }
    );
  }
};


module.exports = ElectrumWallet;
