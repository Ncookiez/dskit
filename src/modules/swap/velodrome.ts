import { SwapArgs, SwapResult } from '.'
import { veloRouterABI } from './abis/velodrome/veloRouterABI'
import { velodrome } from './constants'
import { getPossiblePaths as getPossibleUniswapV2Paths } from './uniswap_v2'
import { getBigIntFraction } from 'src/utils'
import { Address, ContractFunctionParameters, PublicClient } from 'viem'

type Step = { from: Address; to: Address; stable: boolean; factory: Address }
type Path = [Step, ...Step[]]

export const getSwapRoute = async (
  publicClient: PublicClient,
  chainId: number,
  args: SwapArgs,
  config?: { includeRoutesThroughTokens?: Address[] }
): Promise<SwapResult> => {
  const { tokenIn, tokenOut, executionOptions } = args

  if (!velodrome[chainId]) {
    console.warn(`Velodrome routes are not currently supported on network with chain ID ${chainId}`)
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
        address: velodrome[chainId].routerAddress,
        abi: veloRouterABI,
        functionName: 'swapExactTokensForTokens',
        args: [tokenIn.amount, amountOutMin, bestRoute.path, executionOptions.recipient, deadline]
      }
    }
  }

  return { quote: bestRoute.quote }
}

const getPossiblePaths = (chainId: number, tokenInAddress: Address, tokenOutAddress: Address, includeRoutesThroughTokens?: Address[]) => {
  const possiblePaths: Path[] = []

  if (!!velodrome[chainId]) {
    const possibleTokenPaths = getPossibleUniswapV2Paths(chainId, tokenInAddress, tokenOutAddress, includeRoutesThroughTokens)

    possibleTokenPaths.forEach((pathAddresses) =>
      possiblePaths.push(...getPathVariants(pathAddresses, velodrome[chainId].factoryAddresses))
    )
  }

  return possiblePaths
}

// TODO: write better (recursive?) algorithm to handle any length of array
const getPathVariants = (pathAddresses: Address[], factoryAddresses: Address[]) => {
  const pathVariants: Path[] = []

  if (pathAddresses.length === 2) {
    factoryAddresses.forEach((factory) => {
      pathVariants.push([{ from: pathAddresses[0], to: pathAddresses[1], stable: false, factory }])
      pathVariants.push([{ from: pathAddresses[0], to: pathAddresses[1], stable: true, factory }])
    })
  } else if (pathAddresses.length === 3) {
    for (let i = 0; i < factoryAddresses.length; i++) {
      for (let j = 0; j < factoryAddresses.length; j++) {
        for (let k = 0; k < 2; k++) {
          for (let l = 0; l < 2; l++) {
            pathVariants.push([
              { from: pathAddresses[0], to: pathAddresses[1], stable: !!k, factory: factoryAddresses[i] },
              { from: pathAddresses[1], to: pathAddresses[2], stable: !!l, factory: factoryAddresses[j] }
            ])
          }
        }
      }
    }
  } else if (pathAddresses.length === 4) {
    for (let i = 0; i < factoryAddresses.length; i++) {
      for (let j = 0; j < factoryAddresses.length; j++) {
        for (let k = 0; k < factoryAddresses.length; k++) {
          for (let l = 0; l < 2; l++) {
            for (let m = 0; m < 2; m++) {
              for (let n = 0; n < 2; n++) {
                pathVariants.push([
                  { from: pathAddresses[0], to: pathAddresses[1], stable: !!l, factory: factoryAddresses[i] },
                  { from: pathAddresses[1], to: pathAddresses[2], stable: !!m, factory: factoryAddresses[j] },
                  { from: pathAddresses[2], to: pathAddresses[3], stable: !!n, factory: factoryAddresses[k] }
                ])
              }
            }
          }
        }
      }
    }
  }

  return pathVariants
}

const getPathQuotes = async (publicClient: PublicClient, chainId: number, tokenInAmount: bigint, paths: Path[]) => {
  const quotes: { path: Path; quote: bigint }[] = []

  const contracts: ContractFunctionParameters<typeof veloRouterABI, 'view', 'getAmountsOut'>[] = paths.map((path) => ({
    address: velodrome[chainId].routerAddress,
    abi: veloRouterABI,
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
