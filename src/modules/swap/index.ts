import { getSwapRoute as getUniswapV2SwapRoute } from './uniswap_v2'
import { getSwapRoute as getUniswapV3SwapRoute } from './uniswap_v3'
import { getSwapRoute as getVelodromeSwapRoute } from './velodrome'
import { Address, ContractFunctionParameters, PublicClient } from 'viem'

export interface SwapArgs {
  tokenIn: { address: Address; decimals: number; amount: bigint }
  tokenOut: { address: Address; decimals: number }
  executionOptions?: { recipient: Address; slippage?: number; deadline?: number }
}

export interface SwapResult {
  quote: bigint
  request?: ContractFunctionParameters
}

export interface SwapRouteConfig {
  exchanges?: { includeOnly?: ('uniswap_v2' | 'uniswap_v3' | 'velodrome')[]; includeRoutesThroughTokens?: Address[] }
}

export const getSwapRoute = async (publicClient: PublicClient, args: SwapArgs, config?: SwapRouteConfig): Promise<SwapResult> => {
  if (args.tokenIn.address.toLowerCase() === args.tokenOut.address.toLowerCase())
    throw new Error(`The "tokenIn" and "tokenOut" addresses cannot be the same.`)

  const chainId = await publicClient.getChainId()

  const swapRoute: SwapResult = { quote: 0n }

  const uniswapV3SwapRoute =
    !config?.exchanges?.includeOnly?.length || config.exchanges.includeOnly.includes('uniswap_v3')
      ? await getUniswapV3SwapRoute(publicClient, chainId, args, {
          includeRoutesThroughTokens: config?.exchanges?.includeRoutesThroughTokens
        })
      : { quote: 0n }

  if (uniswapV3SwapRoute.quote > swapRoute.quote) {
    swapRoute.quote = uniswapV3SwapRoute.quote
    swapRoute.request = uniswapV3SwapRoute.request
  }

  const uniswapV2SwapRoute =
    !config?.exchanges?.includeOnly?.length || config.exchanges.includeOnly.includes('uniswap_v2')
      ? await getUniswapV2SwapRoute(publicClient, chainId, args, {
          includeRoutesThroughTokens: config?.exchanges?.includeRoutesThroughTokens
        })
      : { quote: 0n }

  if (uniswapV2SwapRoute.quote > swapRoute.quote) {
    swapRoute.quote = uniswapV2SwapRoute.quote
    swapRoute.request = uniswapV2SwapRoute.request
  }

  const velodromeSwapRoute =
    !config?.exchanges?.includeOnly?.length || config.exchanges.includeOnly.includes('velodrome')
      ? await getVelodromeSwapRoute(publicClient, chainId, args, {
          includeRoutesThroughTokens: config?.exchanges?.includeRoutesThroughTokens
        })
      : { quote: 0n }

  if (velodromeSwapRoute.quote > swapRoute.quote) {
    swapRoute.quote = velodromeSwapRoute.quote
    swapRoute.request = velodromeSwapRoute.request
  }

  return swapRoute
}
