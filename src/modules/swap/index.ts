import { getSwapRoute as getUniswapV3SwapRoute } from './uniswap_v3'
import { Pool, Route } from '@uniswap/v3-sdk'
import { Address, PublicClient } from 'viem'

export interface SwapParams {
  tokenIn: { address: Address; decimals: number; amount: bigint }
  tokenOut: { address: Address; decimals: number }
}

export const getSwapRoute = async (publicClient: PublicClient, params: SwapParams) => {
  if (params.tokenIn.address.toLowerCase() === params.tokenOut.address.toLowerCase())
    throw new Error(`The "tokenIn" and "tokenOut" addresses cannot be the same.`)

  const chainId = await publicClient.getChainId()

  const uniswapV3SwapRoute = await getUniswapV3SwapRoute(publicClient, chainId, params)

  // TODO: implement velodrome/aerodrome/ramses swap routes

  return uniswapV3SwapRoute
}
