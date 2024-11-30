import { AbiEvent, Address, GetLogsParameters, GetLogsReturnType, PublicClient } from 'viem'

export interface QueryArgs<Event extends AbiEvent> {
  address: Address
  event: Event
  args: GetLogsParameters<Event>['args']
  fromBlock: bigint
  toBlock: bigint | 'latest'
}

export interface QueryConfig<Event extends AbiEvent> {
  callback?: (log: GetLogsReturnType<Event, undefined, true>[number]) => void
  maxPageSizeInBlocks?: bigint
  paginationDelayInMs?: number
  maxRetries?: number
}

/**
 * Queries a specific event log onchain, handling common errors (rate limiting, block pagination, etc.)
 * @param publicClient The public client to use for fetching onchain data
 * @param args The `viem` parameters for querying an event log
 * - `address` - the address that emitted the event log
 * - `event` - the event ABI
 * - `args` - any indexed arguments to filter by
 * - `fromBlock` - the minimum block to search from
 * - `toBlock` - the maximum block to search until
 * @param config Optional settings and/or callbacks
 * @returns
 */
export const query = async <Event extends AbiEvent>(publicClient: PublicClient, args: QueryArgs<Event>, config?: QueryConfig<Event>) => {
  const logs: GetLogsReturnType<Event, undefined, true> = []

  const maxBlock = args.toBlock === 'latest' ? await publicClient.getBlockNumber() : args.toBlock

  if (args.fromBlock < 1n || maxBlock < 1n || args.fromBlock > maxBlock) {
    throw new Error(`Invalid blocks for event query: ${args.fromBlock} -> ${maxBlock}`)
  }

  let maxPageSizeInBlocks = config?.maxPageSizeInBlocks ?? 10_000_000n

  let fromBlock = args.fromBlock
  let toBlock = args.fromBlock + maxPageSizeInBlocks - 1n

  if (toBlock > maxBlock) {
    toBlock = maxBlock
  }

  // TODO: if query fails, retry a few times
  // TODO: if query fails with rate limited error code, increase pagination delay before retry
  // TODO: if query fails otherwise, lower max page size in blocks before retry
  while (toBlock <= maxBlock) {
    const newLogsPage = await publicClient.getLogs({ ...args, fromBlock, toBlock, strict: true })
    logs.push(...newLogsPage)

    newLogsPage.forEach((log) => config?.callback?.(log))

    fromBlock = toBlock + 1n

    if (toBlock !== maxBlock && toBlock + maxPageSizeInBlocks > maxBlock) {
      toBlock = maxBlock
    } else {
      toBlock += maxPageSizeInBlocks
    }

    if (!!config?.paginationDelayInMs) {
      await new Promise((resolve) => setTimeout(resolve, config.paginationDelayInMs))
    }
  }

  return logs
}
