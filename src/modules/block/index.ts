import { PublicClient } from 'viem'

export interface NearTimestampArgs {
  targetTimestamp: bigint | number
  targetRangeSeconds: number
  verbose?: boolean
}

/**
 * Queries the provider for a block within the given time range of the
 * target timestamp.
 *
 * @param publicClient The viem public client to use for block queries
 * @param targetTimestamp target timestamp in seconds
 * @param targetRangeSeconds maximum number of seconds that the returned
 *  block SHOULD lie within from the target timestamp. If no such block
 *  exists, a block outside this range will be returned.
 *
 *  default: 60 seconds
 * @param verbose verbose logs for block fetching info
 * @returns a Block object close to the target timestamp
 */
export async function nearTimestamp(
  publicClient: PublicClient,
  { targetTimestamp, targetRangeSeconds = 60, verbose = false }: NearTimestampArgs
) {
  const targetTimestampAsBigInt = typeof targetTimestamp === 'number' ? BigInt(targetTimestamp) : targetTimestamp

  // Check if valid range was given
  if (targetRangeSeconds < 1) throw new Error('targetRangeSeconds too small: must be at least 1 second')

  // Get starting block range
  let lb = await publicClient.getBlock({ blockNumber: 0n })
  verbose && console.log('Fetched lower bound block: ', lb.number, lb.timestamp)
  let ub = await publicClient.getBlock()
  verbose && console.log('Fetched upper bound block: ', ub.number, ub.timestamp)
  let estBlock = ub
  let iteration = 0

  while (bigIntAbs(estBlock.timestamp - targetTimestampAsBigInt) > targetRangeSeconds) {
    // Check if target timestamp is outside of range
    if (targetTimestampAsBigInt <= lb.timestamp) {
      return lb
    }
    if (targetTimestampAsBigInt >= ub.timestamp) {
      return ub
    }

    // Check if we have any blocks left to query
    const blockDiff = BigInt(ub.number - lb.number)
    if (blockDiff <= 1) {
      let closest = ub
      if (bigIntAbs(lb.timestamp - targetTimestampAsBigInt) < bigIntAbs(ub.timestamp - targetTimestampAsBigInt)) closest = lb
      return closest
    }

    // Estimate new block for binary squeeze alternating between estimating between block number and block rate
    let estBlockNumber = lb.number + (ub.number - lb.number) / 2n
    if (iteration++ % 2 == 0) {
      // Get the average block time across the current range
      const timeDiff = BigInt(ub.timestamp - lb.timestamp)
      const precision = BigInt(1e6)
      const avgSecBlock = (precision * timeDiff) / blockDiff

      // Handle case where the range has no time difference and return the lower bound (no way to return a block in range)
      if (avgSecBlock == 0n) return lb

      // Estimate based on block times
      estBlockNumber = (precision * (targetTimestampAsBigInt - lb.timestamp)) / avgSecBlock + lb.number
    }
    estBlock = await publicClient.getBlock({ blockNumber: estBlockNumber })

    // Squeeze the search range
    if (estBlock.timestamp > targetTimestampAsBigInt) {
      ub = estBlock
      verbose && console.log('Fetched upper bound block: ', ub.number, ub.timestamp)
    } else if (estBlock.timestamp < targetTimestampAsBigInt) {
      lb = estBlock
      verbose && console.log('Fetched lower bound block: ', lb.number, lb.timestamp)
    }
  }

  return estBlock
}

// Helper function for getting the absolute value of a bigint
const bigIntAbs = (x: bigint) => {
  return x < 0n ? x * -1n : x
}
