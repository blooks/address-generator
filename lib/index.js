var wallets = require('./wallets');

var kue = require('coyno-kue');
var log = require('coyno-log');
var mongo = require('coyno-mongo');
require('../config');


function loadWallet(walletId, userId, callback) {
  return mongo.db.collection('bitcoinwallets').findOne({_id: walletId, userId: userId}, callback);
}

function getWalletByType(wallet) {
  switch (wallet.type) {
    case 'armory':
      return new wallets.ArmoryWallet(wallet);
    case 'bitcoin-wallet':
    case 'trezor':
    case 'mycelium':
    case 'electrum2':
      return new wallets.BIP32Wallet(wallet);
    case 'electrum':
      return new wallets.ElectrumWallet(wallet);
    case 'single-addresses':
      return new wallets.SingleAddressesWallet(wallet);
  }
}

mongo.start(function(err) {
  if (err) {
    throw err;
  }
  kue.jobs.process('wallet.update', function(job, done){
    log.info({wallet: job.data.walletId}, 'Processing job for wallet update');
    if (!job.data.walletId) {
      log.error('Invalid Wallet Id');
      return done('Invalid Wallet Id');
    }
    else if (!job.data.userId) {
      log.error('Invalid User Id');
      return done('Invalid User Id');
    }
    var complete = job.data.complete;

    loadWallet(job.data.walletId, job.data.userId, function(err, wallet) {
      if (err) {
        return done(err);
      }
      else if (!wallet) {
        log.error('Wallet not found');
        return done('Wallet not found');
      }

      wallet = getWalletByType(wallet);

      if (!wallet) {
        return done('Invalid wallet type');
      }
      wallet.update(complete, done);
    });
  });
});
