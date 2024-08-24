import { Address } from 'viem'
import { arbitrum, base, mainnet, optimism } from 'viem/chains'

export const uniswapV3Quoter: { [chainId: number]: Lowercase<Address> } = {
  [arbitrum.id]: '0x61ffe014ba17989e743c5f6cb21bf9697530b21e',
  [base.id]: '0x3d4e44eb1374240ce5f1b871ab261cd16335b76a',
  [mainnet.id]: '0x61ffe014ba17989e743c5f6cb21bf9697530b21e',
  [optimism.id]: '0x61ffe014ba17989e743c5f6cb21bf9697530b21e'
}
