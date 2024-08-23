import * as blockModule from './modules/block'
import * as swapModule from './modules/swap'
import { createPublicClient, http, PublicClient } from 'viem'

// TODO: support ethers or generic public clients as well
export type DSKitParams = { rpcUrl?: string; viemPublicClient?: PublicClient }

/**
 * DSKit Class
 */
export class DSKit {
  publicClient: PublicClient | undefined
  rpcUrl: string | undefined
  chainId: number | undefined

  constructor(params: DSKitParams) {
    // TODO: simple validation
    if (!!params.viemPublicClient) {
      this.publicClient = params.viemPublicClient
    } else if (!!params.rpcUrl) {
      this.rpcUrl = params.rpcUrl
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

  swap = { ...swapModule }

  block = {
    nearTimestamp: async (args: blockModule.NearTimestampArgs) => blockModule.nearTimestamp(await this.getPublicClient(), args)
  }
}

/**
 * Modules
 */
export * from './modules/swap'

/**
 * Utils
 */
export * from './utils'
