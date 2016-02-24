'use strict';

var _ = require('lodash');
var bitcore = require('bitcore-lib');
var Wallet = require('./wallet');
var log = require('coyno-log').child({component: 'BIP32Wallet'});
var async = require('async');


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

BIP32Wallet.prototype._derive = function (startIndex, endIndex, chain) {
    return function (callback) {
      var masterPublicKey = new bitcore.HDPublicKey(this.hdseed);
      var index = startIndex;
      var addresses = [];
      var batchSize = endIndex - startIndex;
      log.debug('Deriving ' + batchSize + ' Addresses');
      async.whilst(function() {
          return index < endIndex
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
              var key = masterPublicKey.derive(('m/0/' + index).toString()).publicKey;
              address.address = bitcore.Address.fromPublicKey(key).toString();
              break;
            case 'change':
              var changeKey = masterPublicKey.derive(('m/1/' + index).toString()).publicKey;
              address.address = bitcore.Address.fromPublicKey(changeKey).toString();
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
    };
};


module.exports = BIP32Wallet;
