import { Address } from 'viem'
import { arbitrum, base, mainnet, optimism } from 'viem/chains'

export const uniswapV3Quoter: { [chainId: number]: Lowercase<Address> } = {
  [arbitrum.id]: '0x61ffe014ba17989e743c5f6cb21bf9697530b21e',
  [base.id]: '0x3d4e44eb1374240ce5f1b871ab261cd16335b76a',
  [mainnet.id]: '0x61ffe014ba17989e743c5f6cb21bf9697530b21e',
  [optimism.id]: '0x61ffe014ba17989e743c5f6cb21bf9697530b21e'
}

export const uniswapV3Router: { [chainId: number]: Lowercase<Address> } = {
  [arbitrum.id]: '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45',
  [base.id]: '0x2626664c2603336e57b271c5c0b26f421741e481',
  [mainnet.id]: '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45',
  [optimism.id]: '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45'
}

export const uniswapV3FactoryOverrides: { [chainId: number]: Lowercase<Address> } = {
  [base.id]: '0x33128a8fc17869897dce68ed026d694621f6fdfd'
}
