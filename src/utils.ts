import { dolphinAddress } from './constants'
import { Address, parseEther } from 'viem'

export const isDolphinAddress = (address: Address) => {
  return address.toLowerCase() === dolphinAddress
}

export const getBigIntFraction = (bigint: bigint, fraction: number) => {
  const shiftedFraction = parseEther(fraction.toFixed(18))
  return (bigint * shiftedFraction) / 10n ** 18n
}
