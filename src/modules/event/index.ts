import { AbiEvent, Address, GetLogsParameters, GetLogsReturnType, PublicClient } from 'viem'

export interface QueryArgs<Event extends AbiEvent> {
  address: Address | Address[]
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
  silent?: boolean
}

/**
 * Queries a specific event log onchain, handling common errors (rate limiting, block pagination, etc.)
 * @param publicClient The public client to use for fetching onchain data
 * @param args The `viem` parameters for querying an event log
 * - `address` - the address(es) that emitted the event log
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
  let paginationDelayInMs = config?.paginationDelayInMs ?? 0
  let maxRetries = config?.maxRetries ?? 2

  let fromBlock = args.fromBlock
  let toBlock = args.fromBlock + maxPageSizeInBlocks - 1n

  if (toBlock > maxBlock) {
    toBlock = maxBlock
  }

  while (toBlock <= maxBlock) {
    let isSuccess = false
    let retryCount = 0

    while (!isSuccess && retryCount < maxRetries) {
      try {
        const newLogsPage = await publicClient.getLogs({ ...args, fromBlock, toBlock, strict: true })
        logs.push(...newLogsPage)

        newLogsPage.forEach((log) => config?.callback?.(log))

        isSuccess = true
      } catch (err: any) {
        if (err.code === 429) {
          const oldPaginationDelayInMs = paginationDelayInMs

          if (paginationDelayInMs === 0) {
            paginationDelayInMs = 1_000
          } else {
            paginationDelayInMs *= 2
          }

          if (retryCount < maxRetries - 1) {
            !config?.silent &&
              console.warn(
                `Event query ran into rate limits (${args.event.name}) - retrying with updated delay; ${oldPaginationDelayInMs}ms -> ${paginationDelayInMs}ms`
              )
          }
        } else {
          const blockRange = toBlock - fromBlock

          if (blockRange > 1_000n) {
            const oldMaxPageSizeInBlocks = maxPageSizeInBlocks

            if (blockRange >= 100_000n && maxPageSizeInBlocks >= 1_000_000n) {
              maxPageSizeInBlocks = 100_000n
            } else if (blockRange >= 10_000n && maxPageSizeInBlocks >= 100_000n) {
              maxPageSizeInBlocks = 10_000n
            } else if (blockRange >= 1_000n && maxPageSizeInBlocks >= 10_000) {
              maxPageSizeInBlocks = 1_000n
            } else {
              maxPageSizeInBlocks = maxPageSizeInBlocks / 2n
            }

            toBlock = fromBlock + maxPageSizeInBlocks - 1n

            if (retryCount < maxRetries - 1) {
              !config?.silent &&
                console.warn(
                  `Event query failed (${
                    args.event.name
                  }) - retrying with updated max block range; ${oldMaxPageSizeInBlocks.toLocaleString()} -> ${maxPageSizeInBlocks.toLocaleString()}`
                )
            }
          }
        }

        retryCount++

        if (retryCount === maxRetries) {
          throw new Error(`Event query failed (${args.event.name})`, err)
        }
      }
    }

    fromBlock = toBlock + 1n

    if (toBlock !== maxBlock && toBlock + maxPageSizeInBlocks > maxBlock) {
      toBlock = maxBlock
    } else {
      toBlock += maxPageSizeInBlocks
    }

    if (!!paginationDelayInMs) {
      await new Promise((resolve) => setTimeout(resolve, paginationDelayInMs))
    }
  }

  return logs
}
