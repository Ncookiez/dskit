import { getSwapRoute } from '../dist/index.js'
import assert from 'assert'
import { createPublicClient, http } from 'viem'
import { optimism } from 'viem/chains'

describe('Swap Module', function () {
  describe('#getSwapRoute()', function () {
    it('should return a swap route for USDC -> WETH on Optimism', async function () {
      this.timeout(30 * 1_000)

      const publicClient = createPublicClient({ chain: optimism, transport: http() })

      const swapRoute = await getSwapRoute(publicClient, {
        tokenIn: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6, amount: 10n ** 8n },
        tokenOut: { address: '0x4200000000000000000000000000000000000006', decimals: 18 }
      })

      assert(swapRoute)
      assert(swapRoute.pools)
      assert(swapRoute.route)
      assert(swapRoute.quote)
    })

    it('should return a swap route for POOL -> USDC on Optimism', async function () {
      this.timeout(30 * 1_000)

      const publicClient = createPublicClient({ chain: optimism, transport: http() })

      const swapRoute = await getSwapRoute(publicClient, {
        tokenIn: { address: '0x395Ae52bB17aef68C2888d941736A71dC6d4e125', decimals: 18, amount: 10n ** 18n },
        tokenOut: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 }
      })

      assert(swapRoute)
      assert(swapRoute.pools)
      assert(swapRoute.route)
      assert(swapRoute.quote)
    })
  })
})
