'use strict'

var ArmoryWallet = require('./armory')
var BIP32Wallet = require('./bip32')
var ElectrumWallet = require('./electrum')
var SingleAddressesWallet = require('./single-addresses')

module.exports = {
  ArmoryWallet: ArmoryWallet,
  BIP32Wallet: BIP32Wallet,
  ElectrumWallet: ElectrumWallet,
  SingleAddressesWallet: SingleAddressesWallet
}
