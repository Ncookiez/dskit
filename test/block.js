import { DSKit } from '../dist/index.js'
import assert from 'assert'
import { describe, it } from 'mocha'

const dskit = new DSKit({ rpcUrl: process.env.ETHEREUM_RPC_URL })

describe('block', () => {
  describe('nearTimestamp', () => {
    it('should return an Ethereum block within a minute of the target timestamp', async function () {
      this.timeout(60_000)
      const targetTimestamp = BigInt(Math.floor(Date.now() / 1000) - 86400)
      const targetRangeSeconds = 60
      const block = await dskit.block.nearTimestamp({
        targetTimestamp,
        targetRangeSeconds,
        verbose: true
      })
      console.log(block.number, block.timestamp)
      assert(Math.abs(Number(block.timestamp - targetTimestamp)) <= BigInt(targetRangeSeconds))
    })
  })
})
