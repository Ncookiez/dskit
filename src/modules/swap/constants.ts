import { Address } from 'viem'
import { arbitrum, base, mainnet, optimism } from 'viem/chains'

export const uniswapV3: {
  [chainId: number]: {
    quoterAddress: Lowercase<Address>
    routerAddress: Lowercase<Address>
    factoryAddress?: Lowercase<Address>
  }
} = {
  [arbitrum.id]: {
    quoterAddress: '0x61ffe014ba17989e743c5f6cb21bf9697530b21e',
    routerAddress: '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45'
  },
  [base.id]: {
    quoterAddress: '0x3d4e44eb1374240ce5f1b871ab261cd16335b76a',
    routerAddress: '0x2626664c2603336e57b271c5c0b26f421741e481',
    factoryAddress: '0x33128a8fc17869897dce68ed026d694621f6fdfd'
  },
  [mainnet.id]: {
    quoterAddress: '0x61ffe014ba17989e743c5f6cb21bf9697530b21e',
    routerAddress: '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45'
  },
  [optimism.id]: {
    quoterAddress: '0x61ffe014ba17989e743c5f6cb21bf9697530b21e',
    routerAddress: '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45'
  }
}
