import { getSwapRoute } from '../swap'
import { Address, formatUnits, PublicClient } from 'viem'

export interface OfTokenArgs {
  token: { address: Address; decimals: number }
  tokenDenominator?: { address: Address; decimals: number }
}

/**
 * Fetches the current exchange rate between two tokens using onchain market swap rates.
 * @param publicClient The public client to use for fetching onchain data
 * @param token The token to fetch the price for
 * @param tokenDenominator The token to denominate the price in (default: USDC)
 * For example, if the `token` is WETH and the `tokenDenominator` is USDC, this function will return how
 * much 1 WETH is worth in USDC in decimal format (ex: 2750.86758482101).
 */
export async function ofToken(publicClient: PublicClient, { token, tokenDenominator }: OfTokenArgs) {
  // Default the token denominator to USDC
  if (!tokenDenominator) {
    tokenDenominator = {
      address: '0x', // TODO: replace with USDC address per chain
      decimals: 6
    }
  }

  // Get the swap quote for token -> tokenDenominator for some small amount (10 ^ decimals)
  const swapAmount = 10n ** BigInt(token.decimals)
  const swapForward = await getSwapRoute(publicClient, {
    tokenIn: { ...token, amount: swapAmount },
    tokenOut: tokenDenominator
  })

  // Get the reverse quote
  const swapBack = await getSwapRoute(publicClient, {
    tokenIn: { ...tokenDenominator, amount: swapForward.quote },
    tokenOut: token
  })

  // If the full circle result is less than the starting amount of token, then compute what fee would
  // likely have been taken on just the forward swap by computing half of the total loss.
  let oneWayFee = 0n
  if (swapBack.quote < swapAmount) {
    oneWayFee = (swapForward.quote * (swapAmount - swapBack.quote)) / (swapAmount * 2n)
  }

  // Return the original quote converted to decimal form with the predicted fee removed
  return parseFloat(formatUnits(swapForward.quote + oneWayFee, tokenDenominator.decimals))
}
