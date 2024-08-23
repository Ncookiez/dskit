import { uniPoolABI } from './abis/uniPoolABI'
import { uniQuoterABI } from './abis/uniQuoterABI'
import { uniswapV3Quoter } from './constants'
import { CurrencyAmount, Token, TradeType } from '@uniswap/sdk-core'
import { FeeAmount, Pool, Route, SwapQuoter } from '@uniswap/v3-sdk'
import { Address, decodeFunctionData, PublicClient } from 'viem'

export const getUniPoolAddresses = (tokenIn: Token, tokenOut: Token) => {
  const poolAddresses: { address: Address; fee: FeeAmount }[] = []

  Object.values(FeeAmount).forEach((fee) => {
    if (typeof fee === 'number') {
      const address = Pool.getAddress(tokenIn, tokenOut, fee) as Address
      poolAddresses.push({ address, fee })
    }
  })

  return [...poolAddresses]
}

export const getUniPoolData = async (publicClient: PublicClient, tokenIn: Token, tokenOut: Token) => {
  const pools: Pool[] = []

  const poolAddresses = getUniPoolAddresses(tokenIn, tokenOut)

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

export const getUniPoolDataWithExtraTokenStep = async (publicClient: PublicClient, tokenIn: Token, tokenOut: Token, tokenStep: Token) => {
  const pools: Pool[][] = []

  const firstStepPools = await getUniPoolData(publicClient, tokenIn, tokenStep)
  const secondStepPools = await getUniPoolData(publicClient, tokenStep, tokenOut)

  for (let i = 0; i < firstStepPools.length; i++) {
    for (let j = 0; j < secondStepPools.length; j++) {
      pools.push([firstStepPools[i], secondStepPools[j]])
    }
  }

  return pools
}

export const getUniRouteQuote = async (
  publicClient: PublicClient,
  uniPools: Pool[],
  tokenIn: Token,
  tokenInAmount: bigint,
  tokenOut: Token
) => {
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

  const quoteResult = await publicClient.simulateContract({
    address: uniswapV3Quoter[tokenIn.chainId],
    abi: uniQuoterABI,
    // @ts-ignore
    functionName,
    // @ts-ignore
    args
  })

  const quote = (quoteResult.result?.[0] as bigint | undefined) ?? 0n

  return { route, quote }
}
