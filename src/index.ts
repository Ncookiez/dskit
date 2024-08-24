import * as blockModule from './modules/block'
import * as swapModule from './modules/swap'
import { createPublicClient, http, PublicClient } from 'viem'

// TODO: support ethers or generic public clients as well
export type DSKitArgs = { rpcUrl?: string; viemPublicClient?: PublicClient }

/**
 * DSKit Class
 */
export class DSKit {
  publicClient: PublicClient | undefined
  rpcUrl: string | undefined
  chainId: number | undefined

  constructor(args: DSKitArgs) {
    // TODO: simple validation
    if (!!args.viemPublicClient) {
      this.publicClient = args.viemPublicClient
    } else if (!!args.rpcUrl) {
      this.rpcUrl = args.rpcUrl
    } else {
      throw new Error('Please include either an "rpcUrl" or "viemPublicClient" when initializing DSKit.')
    }
  }

  async getPublicClient() {
    if (!!this.publicClient) return this.publicClient

    this.publicClient = createPublicClient({ transport: http(this.rpcUrl) })
    return this.publicClient
  }

  async getChainId() {
    if (!!this.chainId) return this.chainId

    this.chainId = await (await this.getPublicClient()).getChainId()
    return this.chainId
  }

  swap = {
    getSwapRoute: async (args: swapModule.SwapArgs) => swapModule.getSwapRoute(await this.getPublicClient(), args)
  }

  block = {
    nearTimestamp: async (args: blockModule.NearTimestampArgs) => blockModule.nearTimestamp(await this.getPublicClient(), args)
  }
}

/**
 * Modules
 */
export * from './modules/block'
export * from './modules/swap'

/**
 * Utils
 */
export * from './utils'
