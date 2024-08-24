import { dolphinAddress, DSKit, usdc, zapRouter } from '../dist/index.js'
import assert from 'assert'

const dskit = new DSKit({ rpcUrl: process.env.OPTIMISM_RPC_URL })

describe('zap', function () {
  describe('tx', function () {
    it('should return a valid zap tx to deposit zap ETH into przUSDC on Optimism', async function () {
      this.timeout(30_000)

      const zapTx = await dskit.zap.tx({
        tokenIn: { address: dolphinAddress, decimals: 18, amount: 10n ** 12n },
        swapTo: usdc[10],
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
          args: [0n, zapRouter[10]],
          injectedAmountIndex: 4
        },
        tokenOut: { address: '0x03D3CE84279cB6F54f5e6074ff0F8319d830dafe', minAmount: 1n },
        userAddress: '0xbE4FeAE32210f682A41e1C41e3eaF4f8204cD29E'
      })

      assert(zapTx)
      assert(zapTx.config)
      assert(zapTx.gasEstimate)
      assert(zapTx.request)
      assert(zapTx.route)
    })
  })
})
