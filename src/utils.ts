import { dolphinAddress } from './constants'
import { Address } from 'viem'

export const isDolphinAddress = (address: Address) => {
  return address.toLowerCase() === dolphinAddress
}
