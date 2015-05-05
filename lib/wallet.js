'use strict';

var _ = require('lodash');
var async = require('async');
var log = require('coyno-log').child({component: 'Wallet'});
var randomId = require('coyno-util').meteor.randomId;
var mongo = require('coyno-mongo');

var Wallet = function (doc) {
  if (!(this instanceof Wallet)) {
    return new Wallet(doc);
  }

  return _.extend(this, doc);
};

Wallet.prototype._walletData = function() {
  var now = new Date();
  return {
    _id: randomId(),
    userId: this.userId,
    walletId: this._id,
    balance: 0,
    createdAt: now,
    updatedAt: now
  }
};



Wallet.prototype._saveAddresses = function (addresses, callback) {
  var self = this;
  addresses = _.map(addresses, function(address) {
    return _.extend(address, self._walletData());
  });
  var addressesCollection = mongo.db.collection('bitcoinaddresses');
  addressesCollection.insertMany(addresses, callback);
};



Wallet.prototype._saveDerivationParams = function(callback) {
  var walletCollection = mongo.db.collection('bitcoinwallets');
  walletCollection.update({_id: this._id}, {$set : { 'derivationParams': this.derivationParams}}, callback)
};

Wallet.prototype.update = function (callback) {
  log.trace({wallet: this._id}, 'Update wallet');
  async.series([
  this._loadDerivationParams.bind(this),
  this.deriveAddresses.bind(this),
  this._saveDerivationParams.bind(this)
  ], callback)
};

Wallet.prototype.remove = function (callback) {
  log.trace({wallet: this._id}, 'Remove addresses from wallet');
  callback();
};


module.exports = Wallet;
