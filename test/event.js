import { DSKit } from '../dist/index.js'
import { describe, it } from 'mocha'
import assert from 'assert'

const transferEventABI = {
  type: 'event',
  name: 'Transfer',
  inputs: [
    { indexed: true, name: 'from', type: 'address' },
    { indexed: true, name: 'to', type: 'address' },
    { indexed: false, name: 'value', type: 'uint256' }
  ]
}

describe('event', () => {
  describe('query', () => {
    describe('on Ethereum', () => {
      const dskit = new DSKit({ rpcUrl: process.env.ETHEREUM_RPC_URL })

      it('should return basic transfer events of a wallet for a specific token', async function () {
        this.timeout(30_000)

        let callbacksCount = 0

        const transferEvents = await dskit.event.query({
          address: '0x0cEC1A9154Ff802e7934Fc916Ed7Ca50bDE6844e',
          event: transferEventABI,
          args: { to: '0xbE4FeAE32210f682A41e1C41e3eaF4f8204cD29E' },
          fromBlock: 16_078_500n,
          toBlock: 16_235_800n
        }, { callback: () => callbacksCount++ })

        assert(transferEvents.length === 2)
        assert(transferEvents[0].eventName === 'Transfer')
        assert(callbacksCount === 2)
      })

      it('should paginate requests when a block limit is specified', async function () {
        this.timeout(30_000)

        const transferEvents = await dskit.event.query({
          address: '0x0cEC1A9154Ff802e7934Fc916Ed7Ca50bDE6844e',
          event: transferEventABI,
          args: { to: '0xbE4FeAE32210f682A41e1C41e3eaF4f8204cD29E' },
          fromBlock: 16_078_500n,
          toBlock: 16_235_800n
        }, { maxPageSizeInBlocks: 100_000n })

        assert(transferEvents.length === 2)
        assert(transferEvents[0].eventName === 'Transfer')
      })
    })
  })
})
