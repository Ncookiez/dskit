import { SwapArgs, SwapResult } from '.'
import { uniQuoterABI } from './abis/uniswap_v3/uniQuoterABI'
import { uniRouterABI } from './abis/uniswap_v3/uniRouterABI'
import { uniswapV3 } from './constants'
import { getPossiblePaths as getPossibleUniswapV2Paths } from './uniswap_v2'
import { getBigIntFraction } from 'src/utils'
import { Address, ContractFunctionParameters, encodePacked, PublicClient } from 'viem'

const feeTiers = [100, 500, 3_000, 10_000] as const
type Fee = (typeof feeTiers)[number]

type Path = [Address, Fee, Address, ...(Fee | Address)[]]

export const getSwapRoute = async (
  publicClient: PublicClient,
  chainId: number,
  args: SwapArgs,
  config?: { includeRoutesThroughTokens?: Address[] }
): Promise<SwapResult> => {
  const { tokenIn, tokenOut, executionOptions } = args

  if (!uniswapV3[chainId]) {
    console.warn(`Uniswap V3 routes are not currently supported on network with chain ID ${chainId}`)
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
    const amountOutMinimum = getBigIntFraction(bestRoute.quote, slippageMultiplier)

    return {
      quote: bestRoute.quote,
      request: {
        address: uniswapV3[chainId].routerAddress,
        abi: uniRouterABI,
        functionName: 'exactInput',
        args: [{ path: getPathBytes(bestRoute.path), recipient: executionOptions.recipient, amountIn: tokenIn.amount, amountOutMinimum }]
      }
    }
  }

  return { quote: bestRoute.quote }
}

const getPossiblePaths = (chainId: number, tokenInAddress: Address, tokenOutAddress: Address, includeRoutesThroughTokens?: Address[]) => {
  const possiblePaths: Path[] = []

  const possibleTokenPaths = getPossibleUniswapV2Paths(chainId, tokenInAddress, tokenOutAddress, includeRoutesThroughTokens)

  possibleTokenPaths.forEach((pathAddresses) => possiblePaths.push(...getPathVariants(pathAddresses)))

  return possiblePaths
}

// TODO: write better (recursive?) algorithm to handle any length of array
const getPathVariants = (pathAddresses: Address[]) => {
  const pathVariants: Path[] = []

  if (pathAddresses.length === 2) {
    feeTiers.forEach((fee) => {
      pathVariants.push([pathAddresses[0], fee, pathAddresses[1]])
    })
  } else if (pathAddresses.length === 3) {
    for (let i = 0; i < feeTiers.length; i++) {
      for (let j = 0; j < feeTiers.length; j++) {
        pathVariants.push([pathAddresses[0], feeTiers[i], pathAddresses[1], feeTiers[j], pathAddresses[2]])
      }
    }
  } else if (pathAddresses.length === 4) {
    for (let i = 0; i < feeTiers.length; i++) {
      for (let j = 0; j < feeTiers.length; j++) {
        for (let k = 0; k < feeTiers.length; k++) {
          pathVariants.push([pathAddresses[0], feeTiers[i], pathAddresses[1], feeTiers[j], pathAddresses[2], feeTiers[k], pathAddresses[3]])
        }
      }
    }
  }

  return pathVariants
}

const getPathQuotes = async (publicClient: PublicClient, chainId: number, tokenInAmount: bigint, paths: Path[]) => {
  const quotes: { path: Path; quote: bigint }[] = []

  const contracts: ContractFunctionParameters<typeof uniQuoterABI, 'nonpayable', 'quoteExactInput'>[] = paths.map((path) => ({
    address: uniswapV3[chainId].quoterAddress,
    abi: uniQuoterABI,
    functionName: 'quoteExactInput',
    args: [getPathBytes(path)!, tokenInAmount]
  }))

  const quotesMulticall = await publicClient.multicall({ contracts })

  paths.forEach((path, i) => {
    const multicall = quotesMulticall[i]

    if (multicall?.status === 'success' && typeof multicall.result === 'object' && typeof multicall.result[0] === 'bigint') {
      quotes.push({ path, quote: multicall.result[0] })
    }
  })

  return quotes
}

// TODO: write better algorithm to handle any path length
const getPathBytes = (path: Path) => {
  if (path.length === 3) {
    return encodePacked(['address', 'uint24', 'address'], path as [Address, Fee, Address])
  } else if (path.length === 5) {
    return encodePacked(['address', 'uint24', 'address', 'uint24', 'address'], path as [Address, Fee, Address, Fee, Address])
  } else if (path.length === 7) {
    return encodePacked(
      ['address', 'uint24', 'address', 'uint24', 'address', 'uint24', 'address'],
      path as [Address, Fee, Address, Fee, Address, Fee, Address]
    )
  }
}
