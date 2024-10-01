import { DSKit, dolphinAddress } from '../dist/index.js'
import { describe, it } from 'mocha'
import { expect } from 'chai'

describe('price', () => {
  describe('ofToken', () => {
    describe('on Optimism', () => {
      const dskit = new DSKit({ rpcUrl: process.env.OPTIMISM_RPC_URL })

      const usdc = { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 }
      const weth = { address: '0x4200000000000000000000000000000000000006', decimals: 18 }

      it('should return similar inverse prices for USDC denominated in WETH and WETH denominated in USDC', async function () {
        this.timeout(90_000)

        const priceUsdcToWeth = await dskit.price.ofToken({ token: usdc, tokenDenominator: weth })
        const priceWethToUsdc = await dskit.price.ofToken({ token: weth, tokenDenominator: usdc })

        expect(priceUsdcToWeth).to.be.gt(0)
        expect(priceWethToUsdc).to.be.gt(0)
        expect(Math.abs(1 / priceUsdcToWeth - priceWethToUsdc)).to.be.lt(5) // less than $5 diff in price
      })

      it('should use WETH as the default denominator', async function () {
        this.timeout(60_000)

        const priceUsdcToDefault = await dskit.price.ofToken({ token: usdc })
        const priceUsdcToWeth = await dskit.price.ofToken({ token: usdc, tokenDenominator: weth })

        expect(Math.abs(1 - priceUsdcToDefault / priceUsdcToWeth)).to.be.lt(0.001) // price is less than 0.1% diff from USDC -> WETH
      })

      it('should be able to handle same token conversions', async function () {
        this.timeout(10_000)

        const priceUsdcToUsdc = await dskit.price.ofToken({ token: usdc, tokenDenominator: usdc })
        expect(priceUsdcToUsdc).to.equal(1)

        const priceUsdcToUsdcDifferentDecimal = await dskit.price.ofToken({ token: usdc, tokenDenominator: { address: usdc.address, decimals: 18 } })
        expect(priceUsdcToUsdcDifferentDecimal).to.equal(1)

        const priceDolphinToDolphin = await dskit.price.ofToken({ token: { address: dolphinAddress, decimals: 18 }, tokenDenominator: { address: dolphinAddress, decimals: 18 } })
        expect(priceDolphinToDolphin).to.equal(1)

        const priceDolphinToWeth = await dskit.price.ofToken({ token: { address: dolphinAddress, decimals: 18 }, tokenDenominator: weth })
        expect(priceDolphinToWeth).to.equal(1)

        const priceWethToDolphin = await dskit.price.ofToken({ token: weth, tokenDenominator: { address: dolphinAddress, decimals: 18 } })
        expect(priceWethToDolphin).to.equal(1)
      })

      it('should be a pure function', async function () {
        this.timeout(10_000)

        const token = { address: dolphinAddress, decimals: 18 }

        await dskit.price.ofToken({ token })

        expect(token.address).to.equal(dolphinAddress)
        expect(token.decimals).to.equal(18)
      })
    })

    describe('on Base', () => {
      it('should find a price for POOL', async function () {
        this.timeout(10_000)

        const dskit = new DSKit({ rpcUrl: process.env.BASE_RPC_URL })

        const poolPrice = await dskit.price.ofToken({ token: { address: '0xd652C5425aea2Afd5fb142e120FeCf79e18fafc3', decimals: 18 } }, { exchanges: { includeRoutesThroughTokens: ['0x368181499736d0c0CC614DBB145E2EC1AC86b8c6'] } })
        expect(poolPrice).to.be.gt(0)
      })
    })
  })
})
