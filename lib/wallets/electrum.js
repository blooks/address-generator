'use strict'
import ElectrumKeyDerivation from '../tools/electrumKeyDerivation'
import _ from 'lodash'
const Wallet = require('./wallet')
const log = require('@blooks/log').child({component: 'Electrum Wallet'})

class ElectrumWallet extends Wallet {
  constructor (walletData, mongoConnection, jobs, {oracleUrl}) {
    super(walletData, mongoConnection, jobs)
    this._oracleUrl = oracleUrl
  }

  _derive (startIndex, endIndex, chain) {
    return callback => {
      const electrumKeyDerivation = ElectrumKeyDerivation({oracleUrl: this._oracleUrl})
      const batchSize = Math.max(0, endIndex - startIndex)
      log.debug('Deriving ' + batchSize + ' Addresses')
      const change = (chain !== 'main')
      electrumKeyDerivation({mpk: this.hdseed, from: startIndex, to: endIndex, change}).then(addressStrings => {
        const addresses = _.range(startIndex, endIndex).map((acc, index) => {
          return {
            derivationParams: {
              'chain': chain,
              'order': index
            },
            address: addressStrings[index]
          }
        })
        return callback(null, addresses)
      })
    }
  }
}

module.exports = ElectrumWallet
