import { Address } from 'viem'
import { arbitrum, base, mainnet, optimism, scroll } from 'viem/chains'

export const weth: { [chainId: number]: { address: Lowercase<Address>; decimals: number } } = {
  [arbitrum.id]: { address: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', decimals: 18 },
  [base.id]: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
  [mainnet.id]: { address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', decimals: 18 },
  [optimism.id]: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
  [scroll.id]: { address: '0x5300000000000000000000000000000000000004', decimals: 18 }
}

export const usdc: { [chainId: number]: { address: Lowercase<Address>; decimals: number } } = {
  [arbitrum.id]: { address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831', decimals: 6 },
  [base.id]: { address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', decimals: 6 },
  [mainnet.id]: { address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decimals: 6 },
  [optimism.id]: { address: '0x0b2c639c533813f4aa9d7837caf62653d097ff85', decimals: 6 },
  [scroll.id]: { address: '0x06efdbff2a14a7c8e15944d1f4a48f9f95f663a4', decimals: 6 }
}

export const dolphinAddress = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
