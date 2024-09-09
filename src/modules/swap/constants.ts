import { Address } from 'viem'
import { arbitrum, base, mainnet, optimism } from 'viem/chains'

export const uniswapV2: { [chainId: number]: { routerAddress: Lowercase<Address> } } = {
  [arbitrum.id]: { routerAddress: '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24' },
  [base.id]: { routerAddress: '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24' },
  [mainnet.id]: { routerAddress: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d' },
  [optimism.id]: { routerAddress: '0x4a7b5da61326a6379179b40d00f57e5bbdc962c2' }
}

export const uniswapV3: {
  [chainId: number]: {
    quoterAddress: Lowercase<Address>
    routerAddress: Lowercase<Address>
  }
} = {
  [arbitrum.id]: {
    quoterAddress: '0x61ffe014ba17989e743c5f6cb21bf9697530b21e',
    routerAddress: '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45'
  },
  [base.id]: {
    quoterAddress: '0x3d4e44eb1374240ce5f1b871ab261cd16335b76a',
    routerAddress: '0x2626664c2603336e57b271c5c0b26f421741e481'
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
