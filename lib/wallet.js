'use strict';

var _ = require('lodash');
var log = require('coyno-log').child({component: 'Wallet'});
var mongo = require('coyno-mongo');

var Wallet = function(doc) {
  if (!(this instanceof Wallet)) {
    return new Wallet(doc);
  }

  return _.extend(this, doc);
};

Wallet.prototype.readAddresses = function (callback) {
  log.trace({wallet: this._id}, 'Read addresses from wallet');

  mongo.db.collection('bitcoinaddresses')
    .find({userId: this.userId, walletId: this._id}).toArray(function(err, addresses) {
      if (err) {
        return callback(err);
      }

      if (addresses.length === 0) {
        return callback(null);
      }

      this.addresses = addresses.map(function(item) { return item.address; });

      callback(null, this.addresses);
    }.bind(this)
  );
};

Wallet.prototype.updateTransactions = function (transactions, callback) {
  log.trace({wallet: this._id}, 'Update transactions from wallet');
  callback(null, transactions /*TODO: affected addresses from transactions*/);

};
Wallet.prototype.updateAddresses = function (addresses, callback) {
  log.trace({wallet: this._id}, 'Update addresses from wallet');
  callback(null, addresses /*TODO: updated addresses*/);

};
Wallet.prototype.updateWalletDetails = function (addresses, callback) {
  log.trace({wallet: this._id}, 'Update details from wallet');
  callback(null, addresses /*TODO: updated wallets*/);
};

module.exports = Wallet;
