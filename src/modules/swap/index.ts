import { getSwapRoute as getUniswapV3SwapRoute } from './uniswap_v3'
import { Address, ContractFunctionParameters, PublicClient } from 'viem'

export interface SwapArgs {
  tokenIn: { address: Address; decimals: number; amount: bigint }
  tokenOut: { address: Address; decimals: number }
  executionOptions?: { recipient: Address; slippage?: number; deadline?: number }
}

export interface SwapResult {
  quote: bigint
  request?: ContractFunctionParameters & { address: Address }
}

export const getSwapRoute = async (publicClient: PublicClient, args: SwapArgs): Promise<SwapResult> => {
  if (args.tokenIn.address.toLowerCase() === args.tokenOut.address.toLowerCase())
    throw new Error(`The "tokenIn" and "tokenOut" addresses cannot be the same.`)

  const chainId = await publicClient.getChainId()

  const uniswapV3SwapRoute = await getUniswapV3SwapRoute(publicClient, chainId, args)

  // TODO: implement velodrome/aerodrome/ramses swap routes

  return { quote: uniswapV3SwapRoute.quote, request: uniswapV3SwapRoute.request }
}
