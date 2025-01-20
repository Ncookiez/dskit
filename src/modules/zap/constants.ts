import { Address } from 'viem'
import { arbitrum, base, gnosis, mainnet, optimism, polygon, scroll } from 'viem/chains'

export const zapRouter: { [chainId: number]: Lowercase<Address> } = {
  [arbitrum.id]: '0xf49f7bb6f4f50d272a0914a671895c4384696e5a',
  [base.id]: '0x6f19da51d488926c007b9ebaa5968291a2ec6a63',
  [gnosis.id]: '0x992ccc9d9b8b76310e044660e96171116820f019',
  [mainnet.id]: '0x5cc9400ffb4da168cf271e912f589462c3a00d1f',
  [optimism.id]: '0xe82343a116d2179f197111d92f9b53611b43c01c',
  [polygon.id]: '0xe90053b8136f18206fcf4f48e0c3b6aed9b1ad71',
  [scroll.id]: '0x75c9d65e7c0d6b40f356452f8a11aed525b67197'
}

export const zapTokenManager: { [chainId: number]: Lowercase<Address> } = {
  [arbitrum.id]: '0x3395bdae49853bc7ab9377d2a93f42bc3a18680e',
  [base.id]: '0x3fbd1da78369864c67d62c242d30983d6900c0f0',
  [gnosis.id]: '0xa59bb0da9565e03f53aefc94fcc205c52fc925b7',
  [mainnet.id]: '0xedfec19ee32f5130084c0acab91fea604c137912',
  [optimism.id]: '0x5a32f67c5ed74dc1b2e031b1bc2c3e965073424f',
  [polygon.id]: '0x2813223ecce2e3a270c6162fdc56be4414ecdbf6',
  [scroll.id]: '0x3d38fa251b0c5dac8b31aef9de7a54b4de114342'
}
