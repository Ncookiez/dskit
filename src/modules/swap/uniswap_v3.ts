import { SwapArgs, SwapResult } from '.'
import { uniPoolABI } from './abis/uniPoolABI'
import { uniQuoterABI } from './abis/uniQuoterABI'
import { uniRouterABI } from './abis/uniRouterABI'
import { uniswapV3FactoryOverrides, uniswapV3Quoter, uniswapV3Router } from './constants'
import { SwapRouter } from '@uniswap/router-sdk'
import { CurrencyAmount, Percent, Token, TradeType } from '@uniswap/sdk-core'
import { FeeAmount, Pool, Route, SwapQuoter, Trade } from '@uniswap/v3-sdk'
import { usdc, weth } from 'src/constants'
import { Address, decodeFunctionData, Hash, PublicClient } from 'viem'

export const getSwapRoute = async (publicClient: PublicClient, chainId: number, args: SwapArgs): Promise<SwapResult> => {
  const tokenIn = new Token(chainId, args.tokenIn.address, args.tokenIn.decimals)
  const tokenOut = new Token(chainId, args.tokenOut.address, args.tokenOut.decimals)

  const possiblePoolRoutes: Pool[][] = []

  // IN -> OUT pools
  const directPools = await getPoolData(publicClient, tokenIn, tokenOut)
  possiblePoolRoutes.push(...directPools.map((pool) => [pool]))

  // IN -> WETH -> OUT pools
  if (
    !!weth[chainId] &&
    tokenIn.address.toLowerCase() !== weth[chainId].address &&
    tokenOut.address.toLowerCase() !== weth[chainId].address
  ) {
    const wethToken = new Token(chainId, weth[chainId].address, weth[chainId].decimals)
    const wethPoolRoutes = await getPoolDataWithExtraTokenStep(publicClient, tokenIn, tokenOut, wethToken)
    possiblePoolRoutes.push(...wethPoolRoutes)
  }

  // IN -> USDC -> OUT pools
  if (
    !!usdc[chainId] &&
    tokenIn.address.toLowerCase() !== usdc[chainId].address &&
    tokenOut.address.toLowerCase() !== usdc[chainId].address
  ) {
    const usdcToken = new Token(chainId, usdc[chainId].address, usdc[chainId].decimals)
    const usdcPoolRoutes = await getPoolDataWithExtraTokenStep(publicClient, tokenIn, tokenOut, usdcToken)
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
      const { route, quote } = await getRouteQuote(publicClient, pools, tokenIn, args.tokenIn.amount, tokenOut)

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

  if (!!uniswapV3Router[chainId] && !!args.executionOptions) {
    const trade = Trade.createUncheckedTrade({
      route: bestRoute.route,
      inputAmount: CurrencyAmount.fromRawAmount(tokenIn, args.tokenIn.amount.toString()),
      outputAmount: CurrencyAmount.fromRawAmount(tokenOut, bestRoute.quote.toString()),
      tradeType: TradeType.EXACT_INPUT
    })

    const callParams = SwapRouter.swapCallParameters([trade], {
      recipient: args.executionOptions.recipient,
      slippageTolerance: new Percent(args.executionOptions.slippage ?? 50, 10_000),
      deadlineOrPreviousBlockhash: Math.floor(args.executionOptions.deadline ?? Date.now() / 1_000 + 1_800)
    })

    const decodedCallParams = decodeFunctionData({
      abi: uniRouterABI,
      data: callParams.calldata as Hash
    })

    return {
      quote: bestRoute.quote,
      request: {
        address: uniswapV3Router[chainId],
        abi: uniRouterABI,
        functionName: decodedCallParams.functionName,
        args: decodedCallParams.args
      }
    }
  }

  return { quote: bestRoute.quote }
}

const getPoolAddresses = (tokenIn: Token, tokenOut: Token) => {
  const poolAddresses: { address: Address; fee: FeeAmount }[] = []

  Object.values(FeeAmount).forEach((fee) => {
    if (typeof fee === 'number') {
      const address = Pool.getAddress(tokenIn, tokenOut, fee, undefined, uniswapV3FactoryOverrides[tokenIn.chainId]) as Address
      poolAddresses.push({ address, fee })
    }
  })

  return [...poolAddresses]
}

const getPoolData = async (publicClient: PublicClient, tokenIn: Token, tokenOut: Token) => {
  const pools: Pool[] = []

  const poolAddresses = getPoolAddresses(tokenIn, tokenOut)

  const multicallResults = await publicClient.multicall({
    contracts: poolAddresses
      .map((pool) => [
        { address: pool.address, abi: uniPoolABI, functionName: 'liquidity' },
        { address: pool.address, abi: uniPoolABI, functionName: 'slot0' }
      ])
      .reduce((a, b) => a.concat(b))
  })

  poolAddresses.forEach((pool, i) => {
    const resultOffset = i * 2

    const liquidityEntry = multicallResults[resultOffset]
    const slot0Entry = multicallResults[1 + resultOffset]

    if (liquidityEntry.status === 'success' && slot0Entry.status === 'success') {
      const liquidity = liquidityEntry.result as bigint
      const slot0 = slot0Entry.result as any as [bigint, number]
      const sqrtRatioX96 = slot0[0]
      const tick = slot0[1]

      if (!!liquidity) {
        pools.push(new Pool(tokenIn, tokenOut, pool.fee, String(sqrtRatioX96), String(liquidity), tick))
      }
    }
  })

  return pools
}

const getPoolDataWithExtraTokenStep = async (publicClient: PublicClient, tokenIn: Token, tokenOut: Token, tokenStep: Token) => {
  const pools: Pool[][] = []

  const firstStepPools = await getPoolData(publicClient, tokenIn, tokenStep)
  const secondStepPools = await getPoolData(publicClient, tokenStep, tokenOut)

  for (let i = 0; i < firstStepPools.length; i++) {
    for (let j = 0; j < secondStepPools.length; j++) {
      pools.push([firstStepPools[i], secondStepPools[j]])
    }
  }

  return pools
}

const getRouteQuote = async (publicClient: PublicClient, uniPools: Pool[], tokenIn: Token, tokenInAmount: bigint, tokenOut: Token) => {
  if (!uniswapV3Quoter[tokenIn.chainId]) throw new Error(`No Uniswap V3 Quoter address found for network with chain ID ${tokenIn.chainId}.`)

  const route = new Route(uniPools, tokenIn, tokenOut)

  const { calldata } = SwapQuoter.quoteCallParameters(
    route,
    CurrencyAmount.fromRawAmount(tokenIn, tokenInAmount.toString()),
    TradeType.EXACT_INPUT,
    { useQuoterV2: true }
  )

  const { functionName, args } = decodeFunctionData({
    abi: uniQuoterABI,
    data: calldata as `0x${string}`
  })

  const { result } = await publicClient.simulateContract({
    address: uniswapV3Quoter[tokenIn.chainId],
    abi: uniQuoterABI,
    // @ts-ignore
    functionName,
    // @ts-ignore
    args
  })

  const quote = (result?.[0] as bigint | undefined) ?? 0n

  return { route, quote }
}
