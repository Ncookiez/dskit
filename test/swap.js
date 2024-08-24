import { DSKit } from '../dist/index.js'
import assert from 'assert'

describe('swap', function () {
  describe('route', function () {
    it('should return a swap route for USDC -> WETH on Optimism', async function () {
      this.timeout(30_000)

      const dskit = new DSKit({ rpcUrl: process.env.OPTIMISM_RPC_URL })

      const swapRoute = await dskit.swap.route({
        tokenIn: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6, amount: 10n ** 8n },
        tokenOut: { address: '0x4200000000000000000000000000000000000006', decimals: 18 }
      })

      assert(swapRoute?.quote)
    })

    it('should return a swap route for POOL -> USDC on Optimism', async function () {
      this.timeout(30_000)

      const dskit = new DSKit({ rpcUrl: process.env.OPTIMISM_RPC_URL })

      const swapRoute = await dskit.swap.route({
        tokenIn: { address: '0x395Ae52bB17aef68C2888d941736A71dC6d4e125', decimals: 18, amount: 10n ** 18n },
        tokenOut: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 }
      })

      assert(swapRoute?.quote)
    })

    it('should return a swap route for WETH -> USDC on Base', async function () {
      this.timeout(30_000)

      const dskit = new DSKit({ rpcUrl: process.env.BASE_RPC_URL })

      const swapRoute = await dskit.swap.route({
        tokenIn: { address: '0x4200000000000000000000000000000000000006', decimals: 18, amount: 10n ** 18n },
        tokenOut: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 }
      })

      assert(swapRoute?.quote)
    })
  })
})
