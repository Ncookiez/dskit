import { DSKit } from '../dist/index.js'
import assert from 'assert'
import { describe, it } from 'mocha'

const dskit = new DSKit({ rpcUrl: process.env.OPTIMISM_RPC_URL })

describe('price', () => {
  describe('ofToken', () => {
    it('should return similar inverse prices for USDC denominated in WETH and WETH denominated in USDC', async function () {
      this.timeout(90_000)
      const usdc = {
        address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
        decimals: 6
      }
      const weth = {
        address: '0x4200000000000000000000000000000000000006',
        decimals: 18
      }
      const priceUsdcToWeth = await dskit.price.ofToken({
        token: usdc,
        tokenDenominator: weth
      })
      console.log('USDC -> WETH ', priceUsdcToWeth)
      const priceWethToUsdc = await dskit.price.ofToken({
        token: weth,
        tokenDenominator: usdc
      })
      console.log('WETH -> USDC ', priceWethToUsdc)
      assert(priceUsdcToWeth > 0)
      assert(priceWethToUsdc > 0)
      assert(Math.abs(1 / priceUsdcToWeth - priceWethToUsdc) < 1) // less than $1 diff in price
    })
  })
})
