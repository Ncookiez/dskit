import { DSKit } from '../dist/index.js'
import { describe, it } from 'mocha'
import assert from 'assert'

describe('block', () => {
  describe('nearTimestamp', () => {
    describe('on Ethereum', () => {
      const dskit = new DSKit({ rpcUrl: process.env.ETHEREUM_RPC_URL })

      it('should return a block within a minute of the target timestamp', async function () {
        this.timeout(60_000)

        const targetTimestamp = BigInt(Math.floor(Date.now() / 1000) - 86400)
        const targetRangeSeconds = 60

        const block = await dskit.block.nearTimestamp({ targetTimestamp, targetRangeSeconds, verbose: true })

        assert(Math.abs(Number(block.timestamp - targetTimestamp)) <= BigInt(targetRangeSeconds))
      })
    })
  })
})
