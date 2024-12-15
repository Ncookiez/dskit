import { getBigIntAbsolute } from 'src/utils'
import { PublicClient } from 'viem'

export interface GetBlockNearTimestampArgs {
  targetTimestamp: bigint | number
  targetRangeSeconds: number
  verbose?: boolean
}

export interface BlockInfo {
  number: bigint
  timestamp: bigint
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
 * @param blockTimestampCache optional cache for known block information
 * in ascending order (if provided, it will be appended with new blocks)
 * @returns a Block object close to the target timestamp
 */
export const getBlockNearTimestamp = async (
  publicClient: PublicClient,
  { targetTimestamp, targetRangeSeconds = 60, verbose = false }: GetBlockNearTimestampArgs,
  blockTimestampCache: BlockInfo[] = []
) => {
  const targetTimestampAsBigInt = typeof targetTimestamp === 'number' ? BigInt(targetTimestamp) : targetTimestamp

  // Check if valid range was given
  if (targetRangeSeconds < 1) throw new Error('targetRangeSeconds too small: must be at least 1 second')

  // Get starting block range
  let lb: BlockInfo =
    blockBeforeOrAtTimestamp(blockTimestampCache, targetTimestampAsBigInt)?.block ??
    (await fetchBlockInfo(0n, publicClient, blockTimestampCache))
  verbose && console.log('Fetched lower bound block: ', lb.number, lb.timestamp)
  let ub: BlockInfo =
    blockAfterOrAtTimestamp(blockTimestampCache, targetTimestampAsBigInt)?.block ??
    (await fetchBlockInfo('latest', publicClient, blockTimestampCache))
  verbose && console.log('Fetched upper bound block: ', ub.number, ub.timestamp)
  let estBlock = ub
  let iteration = 0

  while (getBigIntAbsolute(estBlock.timestamp - targetTimestampAsBigInt) > targetRangeSeconds) {
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
      if (getBigIntAbsolute(lb.timestamp - targetTimestampAsBigInt) < getBigIntAbsolute(ub.timestamp - targetTimestampAsBigInt))
        closest = lb
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
    estBlock = await fetchBlockInfo(estBlockNumber, publicClient, blockTimestampCache)

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

const fetchBlockInfo = async (blockNumber: bigint | 'latest', publicClient: PublicClient, cache: BlockInfo[]) => {
  const res = await publicClient.getBlock({ blockNumber: blockNumber === 'latest' ? undefined : blockNumber })
  const block = { number: res.number, timestamp: res.timestamp }
  const cacheAfterOrAtBlock = blockAfterOrAtTimestamp(cache, block.timestamp)
  if (cacheAfterOrAtBlock) {
    if (cacheAfterOrAtBlock.block.number != block.number) {
      cache.splice(cacheAfterOrAtBlock.cacheIndex, 0, block)
    }
  } else {
    cache.push(block)
  }
  return block
}

const blockBeforeOrAtTimestamp = (cache: BlockInfo[], timestamp: bigint) => {
  let block: BlockInfo | undefined
  let cacheIndex = 0
  for (let i = 0; i < cache.length; i++) {
    if (cache[i].timestamp <= timestamp) {
      block = cache[i]
      cacheIndex = i
    } else {
      break
    }
  }
  return block ? { block, cacheIndex } : null
}

const blockAfterOrAtTimestamp = (cache: BlockInfo[], timestamp: bigint) => {
  let block: BlockInfo | undefined
  let cacheIndex = 0
  for (let i = cache.length - 1; i >= 0; i--) {
    if (cache[i].timestamp >= timestamp) {
      block = cache[i]
      cacheIndex = i
    } else {
      break
    }
  }
  return block ? { block, cacheIndex } : null
}
