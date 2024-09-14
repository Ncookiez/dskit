import { SwapArgs, SwapResult } from '.'
import { uniRouterABI } from './abis/uniswap_v2/uniRouterABI'
import { uniswapV2 } from './constants'
import { usdc, weth } from 'src/constants'
import { getBigIntFraction } from 'src/utils'
import { Address, ContractFunctionParameters, isAddress, PublicClient } from 'viem'

type Path = [Address, Address, ...Address[]]

export const getSwapRoute = async (
  publicClient: PublicClient,
  chainId: number,
  args: SwapArgs,
  config?: { includeRoutesThroughTokens?: Address[] }
): Promise<SwapResult> => {
  const { tokenIn, tokenOut, executionOptions } = args

  if (!uniswapV2[chainId]) {
    console.warn(`Uniswap V2 routes are not currently supported on network with chain ID ${chainId}`)
    return { quote: 0n }
  }

  const possiblePaths = getPossiblePaths(chainId, tokenIn.address, tokenOut.address, config?.includeRoutesThroughTokens)

  const pathQuotes = await getPathQuotes(publicClient, chainId, tokenIn.amount, possiblePaths)

  let bestRoute = pathQuotes[0]
  pathQuotes.forEach((route) => {
    if (!bestRoute || route.quote > bestRoute.quote) {
      bestRoute = route
    }
  })

  if (!bestRoute) return { quote: 0n }

  if (!!executionOptions) {
    const slippageMultiplier = 1 - Math.floor((executionOptions.slippage ?? 10_000) / 1e6)
    const amountOutMin = getBigIntFraction(bestRoute.quote, slippageMultiplier)
    const deadline = executionOptions.deadline ?? Math.floor(Date.now() / 1_000) + 600

    return {
      quote: bestRoute.quote,
      request: {
        address: uniswapV2[chainId].routerAddress,
        abi: uniRouterABI,
        functionName: 'swapExactTokensForTokens',
        args: [tokenIn.amount, amountOutMin, bestRoute.path, executionOptions.recipient, deadline]
      }
    }
  }

  return { quote: bestRoute.quote }
}

export const getPossiblePaths = (
  chainId: number,
  tokenInAddress: Address,
  tokenOutAddress: Address,
  includeRoutesThroughTokens?: Address[]
) => {
  const possiblePaths: Path[] = []
  const tokensToRouteThrough = new Set<Lowercase<Address>>()

  const unfilteredTokensToRouteThrough = [weth[chainId]?.address, usdc[chainId]?.address, ...(includeRoutesThroughTokens ?? [])]

  unfilteredTokensToRouteThrough.forEach((_tokenAddress) => {
    const tokenAddress = !!_tokenAddress && isAddress(_tokenAddress) ? (_tokenAddress.toLowerCase() as Lowercase<Address>) : undefined

    if (!!tokenAddress && tokenAddress !== tokenInAddress.toLowerCase() && tokenAddress !== tokenOutAddress.toLowerCase()) {
      tokensToRouteThrough.add(tokenAddress)
    }
  })

  // IN -> OUT
  possiblePaths.push([tokenInAddress, tokenOutAddress])

  tokensToRouteThrough.forEach((tokenAddress) => {
    // IN -> [TOKEN] -> OUT
    possiblePaths.push([tokenInAddress, tokenAddress, tokenOutAddress])

    tokensToRouteThrough.forEach((otherTokenAddress) => {
      if (tokenAddress !== otherTokenAddress) {
        // IN -> [TOKEN] -> [TOKEN] -> OUT
        possiblePaths.push([tokenInAddress, tokenAddress, otherTokenAddress, tokenOutAddress])
      }
    })
  })

  return possiblePaths
}

const getPathQuotes = async (publicClient: PublicClient, chainId: number, tokenInAmount: bigint, paths: Path[]) => {
  const quotes: { path: Path; quote: bigint }[] = []

  const contracts: ContractFunctionParameters<typeof uniRouterABI, 'view', 'getAmountsOut'>[] = paths.map((path) => ({
    address: uniswapV2[chainId].routerAddress,
    abi: uniRouterABI,
    functionName: 'getAmountsOut',
    args: [tokenInAmount, path]
  }))

  const quotesMulticall = await publicClient.multicall({ contracts })

  paths.forEach((path, i) => {
    const multicall = quotesMulticall[i]

    if (multicall?.status === 'success' && typeof multicall.result === 'object' && multicall.result.length > 0) {
      quotes.push({ path, quote: multicall.result.at(-1)! })
    }
  })

  return quotes
}
