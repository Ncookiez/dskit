import * as blockModule from './modules/block'
import * as priceModule from './modules/price'
import * as swapModule from './modules/swap'
import * as zapModule from './modules/zap'
import { createPublicClient, http, PublicClient } from 'viem'
import * as chains from 'viem/chains'

// TODO: support ethers or generic public clients as well
export type DSKitArgs = { rpcUrl?: string; viemPublicClient?: PublicClient }

/**
 * DSKit Class
 */
export class DSKit {
  publicClient: PublicClient | undefined
  rpcUrl: string | undefined

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

    const chainMap = Object.fromEntries(
      (Object.entries(chains) as [string, any][]).filter(([_, obj]) => obj && obj.id).map(([_, chain]) => [chain.id, chain]) as any
    )

    const unknownClient = createPublicClient({ transport: http(this.rpcUrl) })
    const chainId = await unknownClient.getChainId()

    this.publicClient = createPublicClient({
      batch: { multicall: true },
      chain: chainMap[chainId],
      transport: http(this.rpcUrl)
    }) as PublicClient

    return this.publicClient
  }

  block = {
    nearTimestamp: async (args: blockModule.GetBlockNearTimestampArgs) =>
      blockModule.getBlockNearTimestamp(await this.getPublicClient(), args)
  }

  price = {
    ofToken: async (args: priceModule.GetTokenPriceArgs, swapRouteConfig?: swapModule.SwapRouteConfig) =>
      priceModule.getTokenPrice(await this.getPublicClient(), args, swapRouteConfig)
  }

  swap = {
    route: async (args: swapModule.SwapArgs, config?: swapModule.SwapRouteConfig) =>
      swapModule.getSwapRoute(await this.getPublicClient(), args, config)
  }

  zap = {
    tx: async (args: zapModule.ZapTxArgs, swapRouteConfig?: swapModule.SwapRouteConfig) =>
      zapModule.getZapTx(await this.getPublicClient(), args, swapRouteConfig)
  }
}

/**
 * Modules
 */
export * from './modules/block'
export * from './modules/price'
export * from './modules/swap'
export * from './modules/zap'

/**
 * Constants
 */
export * from './constants'

/**
 * Utils
 */
export * from './utils'
