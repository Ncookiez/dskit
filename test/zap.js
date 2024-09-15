import { dolphinAddress, DSKit, usdc, weth, zapRouter } from '../dist/index.js'
import { base, optimism } from 'viem/chains'
import { parseUnits } from 'viem'
import assert from 'assert'

describe('zap', () => {
  describe('tx', () => {
    describe('on Optimism', () => {
      const dskit = new DSKit({ rpcUrl: process.env.OPTIMISM_RPC_URL })

      it('should return a valid zap tx to deposit zap ETH into przUSDC', async function () {
        this.timeout(30_000)

        const zapTx = await dskit.zap.tx({
          tokenIn: { address: dolphinAddress, decimals: 18, amount: 10n ** 12n },
          swapTo: usdc[optimism.id],
          action: {
            address: '0x03D3CE84279cB6F54f5e6074ff0F8319d830dafe',
            abi: [
              {
                inputs: [
                  { internalType: 'uint256', name: '_assets', type: 'uint256' },
                  { internalType: 'address', name: '_receiver', type: 'address' }
                ],
                name: 'deposit',
                outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
                stateMutability: 'nonpayable',
                type: 'function'
              }
            ],
            functionName: 'deposit',
            args: [0n, zapRouter[optimism.id]],
            injectedAmountIndex: 4
          },
          tokenOut: { address: '0x03D3CE84279cB6F54f5e6074ff0F8319d830dafe', minAmount: 1n },
          userAddress: '0xbE4FeAE32210f682A41e1C41e3eaF4f8204cD29E'
        })

        assert(zapTx)
        assert(zapTx.route)
        assert(zapTx.config)
        assert(zapTx.request)

        await dskit.publicClient.simulateContract({ ...zapTx.request, account: '0xbE4FeAE32210f682A41e1C41e3eaF4f8204cD29E' })
      })
    })

    describe('on Base', () => {
      const dskit = new DSKit({ rpcUrl: process.env.BASE_RPC_URL })

      it('should return a valid zap tx to deposit zap ETH into przPOOL', async function () {
        this.timeout(30_000)

        const swapTo = { address: '0xd652C5425aea2Afd5fb142e120FeCf79e18fafc3', decimals: 18 }
        const priceWethToPool = await dskit.price.ofToken(
          { token: weth[base.id], tokenDenominator: swapTo },
          { exchanges: { includeOnly: ['velodrome'], includeRoutesThroughTokens: ['0x368181499736d0c0CC614DBB145E2EC1AC86b8c6'] } }
        )
        const minAmount = parseUnits(`${0.00095 * priceWethToPool}`, swapTo.decimals)

        const zapTx = await dskit.zap.tx({
          tokenIn: { address: dolphinAddress, decimals: 18, amount: 10n ** 15n },
          swapTo,
          action: {
            address: '0x6B5a5c55E9dD4bb502Ce25bBfbaA49b69cf7E4dd',
            abi: [
              {
                inputs: [
                  { internalType: 'uint256', name: '_assets', type: 'uint256' },
                  { internalType: 'address', name: '_receiver', type: 'address' }
                ],
                name: 'deposit',
                outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
                stateMutability: 'nonpayable',
                type: 'function'
              }
            ],
            functionName: 'deposit',
            args: [0n, zapRouter[base.id]],
            injectedAmountIndex: 4
          },
          tokenOut: { address: '0x6B5a5c55E9dD4bb502Ce25bBfbaA49b69cf7E4dd', minAmount },
          userAddress: '0xbE4FeAE32210f682A41e1C41e3eaF4f8204cD29E'
        }, { exchanges: { includeOnly: ['velodrome'], includeRoutesThroughTokens: ['0x368181499736d0c0CC614DBB145E2EC1AC86b8c6'] } })

        assert(zapTx)
        assert(zapTx.route)
        assert(zapTx.config)
        assert(zapTx.request)

        await dskit.publicClient.simulateContract({ ...zapTx.request, account: '0xbE4FeAE32210f682A41e1C41e3eaF4f8204cD29E' })
      })
    })
  })
})
