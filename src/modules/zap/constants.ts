import { Address } from 'viem'
import { arbitrum, base, mainnet, optimism } from 'viem/chains'

export const zapRouter: { [chainId: number]: Lowercase<Address> } = {
  [arbitrum.id]: '0xf49f7bb6f4f50d272a0914a671895c4384696e5a',
  [base.id]: '0x6f19da51d488926c007b9ebaa5968291a2ec6a63',
  [mainnet.id]: '0x5cc9400ffb4da168cf271e912f589462c3a00d1f',
  [optimism.id]: '0xe82343a116d2179f197111d92f9b53611b43c01c'
}

export const zapTokenManager: { [chainId: number]: Lowercase<Address> } = {
  [arbitrum.id]: '0x3395bdae49853bc7ab9377d2a93f42bc3a18680e',
  [base.id]: '0x3fbd1da78369864c67d62c242d30983d6900c0f0',
  [mainnet.id]: '0xedfec19ee32f5130084c0acab91fea604c137912',
  [optimism.id]: '0x5a32f67c5ed74dc1b2e031b1bc2c3e965073424f'
}
