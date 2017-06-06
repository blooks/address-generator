import nock from 'nock'
import Promise from 'bluebird'
import {expect} from 'chai'
import _ from 'lodash'

import ElectrumWallet from './electrum'
import { addresses, changeAddresses, mpk } from '../../test/electrum.data.test.json'

describe.only('Testing Electrum Address Generation', function () {
  let electrumWallet
  beforeEach(function () {
    electrumWallet = new ElectrumWallet(null, null, null, { oracleUrl: 'http://localhost.local' })
    electrumWallet.hdseed = mpk
  })
  it('should correctly derive a bunch of addresses', function () {

    nock('http://localhost.local').get(`/${mpk}`).query(true).reply(200, _.pick(addresses, _.range(0, 45)))

    const derive = Promise.promisify(electrumWallet._derive(0, 45, 'main'))
    return derive().then(derivedAddresses => {
      expect(derivedAddresses).to.exist
      expect(derivedAddresses).to.have.length(45)
      derivedAddresses.map((address, index) => {
        expect(address.derivationParams).to.deep.equal({
          chain: 'main',
          order: index
        })
        expect(address.address).to.equal(addresses[ index ])
      })
    })
  })
  it('should correctly derive a bunch of change addresses', function () {

    nock('http://localhost.local').get(`/${mpk}`).query(true).reply(200, _.pick(changeAddresses, _.range(0, 45)))

    const derive = Promise.promisify(electrumWallet._derive(0, 45, 'change'))
    return derive().then(derivedAddresses => {
      expect(derivedAddresses).to.exist
      expect(derivedAddresses).to.have.length(45)
      derivedAddresses.map((address, index) => {
        expect(address.derivationParams).to.deep.equal({
          chain: 'change',
          order: index
        })
        expect(address.address).to.equal(changeAddresses[ index ])
      })
    })
  })
})
