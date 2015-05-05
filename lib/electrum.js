'use strict';

var _ = require('lodash');
var bitcore = require('bitcore');
var Electrum = require('bitcore-electrum');
var config = require('../config');
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

ElectrumWallet.prototype._loadDerivationParams = function(callback) {
  this.derivationParams = this.derivationParams || {};
  if (!this.derivationParams || !this.derivationParams.change || !this.derivationParams.change.lastDerived) {
    this.derivationParams = _.extend(this.derivationParams, {
      change: {
        lastDerived: 0
      }
    });
    if (!this.derivationParams.change.lastUsed) {
      this.derivationParams.change.lastUsed = 0;
    }
  }
  if (!this.derivationParams || !this.derivationParams.main || !this.derivationParams.main.lastDerived) {
    this.derivationParams = _.extend(this.derivationParams, {
      main: {
        lastDerived: 0
      }
    });
    if (!this.derivationParams.main.lastUsed) {
      this.derivationParams.main.lastUsed = 0;
    }
  }
  callback();
};

ElectrumWallet.prototype.deriveAddresses = function (callback) {
  var self = this;
  log.debug('Deriving Addresses for Electrum wallet (version 1).');
  var derivationParams = self.derivationParams;
  var startIndexMain = derivationParams['main'].lastDerived;
  var endIndexMain = derivationParams['main'].lastUsed + config.bufferSize;
  var startIndexChange = derivationParams['change'].lastDerived;
  var endIndexChange = derivationParams['change'].lastUsed + config.bufferSize;
  async.parallel([
    self._derive(startIndexMain, endIndexMain, 'main').bind(this),
    self._derive(startIndexChange, endIndexChange, 'change').bind(this)
  ], function(err, result) {
    if (err) {
      return callback(err);
    }
    result = _.flatten(result);
    self._saveAddresses(result, callback);
  });
};

ElectrumWallet.prototype._derive = function (startIndex, endIndex, chain) {
  return function (callback) {
    var masterPublicKey = new Electrum(this.hdseed);
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
