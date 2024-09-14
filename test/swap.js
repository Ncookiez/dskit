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

    it('should return a uniswap swap route for POOL -> DAI on Ethereum', async function () {
      this.timeout(30_000)

      const dskit = new DSKit({ rpcUrl: process.env.ETHEREUM_RPC_URL })

      const swapRoute = await dskit.swap.route({
        tokenIn: { address: '0x0cEC1A9154Ff802e7934Fc916Ed7Ca50bDE6844e', decimals: 18, amount: 10n ** 18n },
        tokenOut: { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 }
      }, { exchanges: { includeOnly: ['uniswap_v2', 'uniswap_v3'] } })

      assert(swapRoute?.quote)
    })

    it('should return a velodrome swap route for POOL -> WETH on Base', async function () {
      this.timeout(30_000)

      const dskit = new DSKit({ rpcUrl: process.env.BASE_RPC_URL })

      const swapRoute = await dskit.swap.route({
        tokenIn: { address: '0xd652C5425aea2Afd5fb142e120FeCf79e18fafc3', decimals: 18, amount: 10n ** 18n },
        tokenOut: { address: '0x4200000000000000000000000000000000000006', decimals: 18 }
      }, { exchanges: { includeOnly: ['velodrome'], includeRoutesThroughTokens: ['0x368181499736d0c0CC614DBB145E2EC1AC86b8c6'] } })

      assert(swapRoute?.quote)
    })
  })
})
