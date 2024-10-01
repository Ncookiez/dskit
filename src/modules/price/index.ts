import { getSwapRoute, SwapRouteConfig } from '../swap'
import { dolphinAddress, weth } from 'src/constants'
import { Address, formatUnits, PublicClient } from 'viem'

export interface GetTokenPriceArgs {
  token: { address: Address; decimals: number }
  tokenDenominator?: { address: Address; decimals: number }
}

/**
 * Fetches the current exchange rate between two tokens using onchain market swap rates.
 * @param publicClient The public client to use for fetching onchain data
 * @param token The token to fetch the price for
 * @param tokenDenominator The token to denominate the price in (default: WETH)
 * For example, if the `token` is WETH and the `tokenDenominator` is USDC, this function will return how
 * much 1 WETH is worth in USDC in decimal format (ex: 2750.86758482101).
 * @param swapRouteConfig Optional configuration for queried swap routes
 *
 * @dev If either token is specified as the `0xeee...eee` address, it will assume it is WETH and use the
 * WETH address for that network.
 */
export const getTokenPrice = async (
  publicClient: PublicClient,
  { token: _token, tokenDenominator }: GetTokenPriceArgs,
  swapRouteConfig?: SwapRouteConfig
) => {
  const token = { ..._token }

  const chainId = publicClient.chain?.id ?? (await publicClient.getChainId())
  const networkWeth = weth[chainId]

  // Default the token denominator to WETH
  if (!tokenDenominator) {
    tokenDenominator = networkWeth
  }

  // Replace native token address with WETH
  if (BigInt(token.address) == BigInt(dolphinAddress)) {
    token.address = networkWeth.address
  }
  if (BigInt(tokenDenominator.address) == BigInt(dolphinAddress)) {
    tokenDenominator.address = networkWeth.address
  }

  // If either of the tokens is undefined, the client is likely on a network that does not have a WETH address
  if (!token || !tokenDenominator) {
    if (!networkWeth) {
      throw new Error(
        `The client network (chainId: ${chainId} [0x${chainId.toString(
          16
        )}]) does not have a WETH token configured or is attempting to resolve a wrapped native token for pricing. You may need to specify the ERC20 token info for both the token and tokenDenominator on this network.`
      )
    } else {
      throw new Error('Missing token or token denominator info in pricing call.')
    }
  }

  // Check if token is the same as denominator
  if (BigInt(token.address) == BigInt(tokenDenominator.address)) {
    return 1.0
  }

  // Get the swap quote for token -> tokenDenominator for some small amount (10 ^ decimals)
  const swapAmount = 10n ** BigInt(token.decimals)
  const swapForward = await getSwapRoute(
    publicClient,
    { tokenIn: { ...token, amount: swapAmount }, tokenOut: tokenDenominator },
    swapRouteConfig
  )

  // Get the reverse quote
  const swapBack = await getSwapRoute(
    publicClient,
    { tokenIn: { ...tokenDenominator, amount: swapForward.quote }, tokenOut: token },
    swapRouteConfig
  )

  // If the full circle result is less than the starting amount of token, then compute what fee would
  // likely have been taken on just the forward swap by computing half of the total loss.
  let oneWayFee = 0n
  if (swapBack.quote < swapAmount) {
    oneWayFee = (swapForward.quote * (swapAmount - swapBack.quote)) / (swapAmount * 2n)
  }

  // Return the original quote converted to decimal form with the predicted fee removed
  return parseFloat(formatUnits(swapForward.quote + oneWayFee, tokenDenominator.decimals))
}
