import { usdc, weth } from './constants'
import { getUniPoolData, getUniPoolDataWithExtraTokenStep, getUniRouteQuote } from './uniswap'
import { Token } from '@uniswap/sdk-core'
import { Pool, Route } from '@uniswap/v3-sdk'
import { Address, PublicClient } from 'viem'

export interface SwapParams {
  tokenIn: { address: Address; decimals: number; amount: bigint }
  tokenOut: { address: Address; decimals: number }
}

// TODO: implement velodrome/aerodrome/ramses swap routes
export const getSwapRoute = async (publicClient: PublicClient, params: SwapParams) => {
  if (params.tokenIn.address.toLowerCase() === params.tokenOut.address.toLowerCase())
    throw new Error(`The "tokenIn" and "tokenOut" addresses cannot be the same.`)

  const chainId = await publicClient.getChainId()

  const tokenIn = new Token(chainId, params.tokenIn.address, params.tokenIn.decimals)
  const tokenOut = new Token(chainId, params.tokenIn.address, params.tokenIn.decimals)

  const possiblePoolRoutes: Pool[][] = []

  // IN -> OUT pools
  const directPools = await getUniPoolData(publicClient, tokenIn, tokenOut)
  possiblePoolRoutes.push(...directPools.map((pool) => [pool]))

  // IN -> WETH -> OUT pools
  if (
    !!weth[chainId] &&
    tokenIn.address.toLowerCase() !== weth[chainId].address &&
    tokenOut.address.toLowerCase() !== weth[chainId].address
  ) {
    const wethToken = new Token(chainId, weth[chainId].address, weth[chainId].decimals)
    const wethPoolRoutes = await getUniPoolDataWithExtraTokenStep(publicClient, tokenIn, tokenOut, wethToken)
    possiblePoolRoutes.push(...wethPoolRoutes)
  }

  // IN -> USDC -> OUT pools
  if (
    !!usdc[chainId] &&
    tokenIn.address.toLowerCase() !== usdc[chainId].address &&
    tokenOut.address.toLowerCase() !== usdc[chainId].address
  ) {
    const usdcToken = new Token(chainId, usdc[chainId].address, usdc[chainId].decimals)
    const usdcPoolRoutes = await getUniPoolDataWithExtraTokenStep(publicClient, tokenIn, tokenOut, usdcToken)
    possiblePoolRoutes.push(...usdcPoolRoutes)
  }

  if (!possiblePoolRoutes.length) throw new Error(`No swap routes found for: ${tokenIn.address} -> ${tokenOut.address}`)

  const routeQuotes: {
    pools: Pool[]
    route: Route<typeof tokenIn, typeof tokenOut>
    quote: bigint
  }[] = []

  await Promise.all(
    possiblePoolRoutes.map(async (pools) => {
      const { route, quote } = await getUniRouteQuote(publicClient, pools, tokenIn, params.tokenIn.amount, tokenOut)

      routeQuotes.push({ pools, route, quote })
    })
  )

  if (!routeQuotes.length || routeQuotes.every((entry) => !entry.quote))
    throw new Error(`No quotes found for: ${tokenIn.address} -> ${tokenOut.address}`)

  let bestRoute = routeQuotes[0]
  routeQuotes.forEach((route) => {
    if (!bestRoute || route.quote > bestRoute.quote) {
      bestRoute = route
    }
  })

  return bestRoute
}
