import { getSwapRoute } from '../swap'
import { zapRouterABI } from './abis/zapRouterABI'
import { zapRouter, zapTokenManager } from './constants'
import { weth } from 'src/constants'
import { isDolphinAddress } from 'src/utils'
import {
  Abi,
  Address,
  ContractFunctionArgs,
  ContractFunctionParameters,
  encodeFunctionData,
  Mutable,
  parseUnits,
  PublicClient,
  zeroAddress
} from 'viem'

export interface ZapTxArgs {
  tokenIn: { address: Address; decimals: number; amount: bigint }
  swapTo?: { address: Address; decimals: number }
  action: ContractFunctionParameters & { injectedAmountIndex?: number }
  tokenOut?: { address: Address; decimals: number; minAmount: bigint }
  userAddress: Address
  recipient?: Address
}

type ZapConfig = ContractFunctionArgs<typeof zapRouterABI, 'payable', 'executeOrder'>[0]
type ZapRoute = Mutable<ContractFunctionArgs<typeof zapRouterABI, 'payable', 'executeOrder'>[1]>

export const getZapTx = async (publicClient: PublicClient, args: ZapTxArgs) => {
  const { tokenIn, swapTo, action, tokenOut, userAddress, recipient } = args

  if (tokenIn.address.toLowerCase() === swapTo?.address.toLowerCase())
    throw new Error('The "tokenIn" and "swapTo" addresses cannot be the same.')

  const chainId = await publicClient.getChainId()

  if (!zapRouter[chainId]) throw new Error(`No zap router address found for network with chain ID ${chainId}.`)
  if (!zapTokenManager[chainId]) throw new Error(`No zap token manager address found for network with chain ID ${chainId}`)

  const zapInputs: ZapConfig['inputs'] = [
    { token: isDolphinAddress(tokenIn.address) ? zeroAddress : tokenIn.address, amount: tokenIn.amount }
  ]

  const zapOutputs: Mutable<ZapConfig['outputs']> = [
    { token: isDolphinAddress(tokenIn.address) ? zeroAddress : tokenIn.address, minOutputAmount: 0n }
  ]

  const route: ZapRoute = []

  const addZapOutput = (newOutput: (typeof zapOutputs)[number]) => {
    const existingOutputIndex = zapOutputs.findIndex((output) => output.token.toLowerCase() === newOutput.token.toLowerCase())
    if (existingOutputIndex === -1) {
      zapOutputs.push(newOutput)
    } else if (zapOutputs[existingOutputIndex].minOutputAmount < newOutput.minOutputAmount) {
      zapOutputs[existingOutputIndex].minOutputAmount = newOutput.minOutputAmount
    }
  }

  if (!!tokenOut) {
    addZapOutput({ token: isDolphinAddress(tokenOut.address) ? zeroAddress : tokenOut.address, minOutputAmount: tokenOut.minAmount })
  }

  if (!!swapTo) {
    if (isDolphinAddress(tokenIn.address) && !weth[chainId])
      throw new Error(`Wrapping ETH not supported on network with chain ID ${chainId}.`)

    addZapOutput({ token: swapTo.address, minOutputAmount: 0n })

    if (isDolphinAddress(tokenIn.address)) {
      addZapOutput({ token: weth[chainId].address, minOutputAmount: 0n })

      route.push({
        target: weth[chainId].address,
        value: tokenIn.amount,
        data: encodeFunctionData({
          abi: [{ constant: false, inputs: [], name: 'deposit', outputs: [], payable: true, stateMutability: 'payable', type: 'function' }],
          functionName: 'deposit'
        }),
        tokens: [{ token: zeroAddress, index: -1 }]
      })
    }

    if (swapTo.address.toLowerCase() !== weth[chainId].address) {
      const swapTokenIn = isDolphinAddress(tokenIn.address) ? { ...weth[chainId], amount: tokenIn.amount } : tokenIn

      const swapRoute = await getSwapRoute(publicClient, { tokenIn: swapTokenIn, tokenOut: swapTo })

      route.push({
        target: swapRoute.request.address,
        value: swapRoute.request.value ?? 0n,
        data: encodeFunctionData({
          abi: swapRoute.request.abi as Abi,
          functionName: swapRoute.request.functionName,
          args: swapRoute.request.args
        }),
        tokens: [{ token: swapTokenIn.address, index: -1 }]
      })
    }
  }

  route.push({
    target: action.address,
    value: isDolphinAddress(tokenIn.address) && !swapTo ? tokenIn.amount : 0n,
    data: encodeFunctionData({ abi: action.abi, functionName: action.functionName, args: action.args }),
    tokens: [!!swapTo ? { token: swapTo.address, index: action.injectedAmountIndex ?? -1 } : { token: tokenIn.address, index: -1 }]
  })

  const config: ZapConfig = {
    inputs: zapInputs,
    outputs: zapOutputs,
    relay: { target: zeroAddress, value: 0n, data: '0x0' },
    user: userAddress,
    recipient: recipient ?? userAddress
  }

  const gasEstimate = await publicClient.estimateContractGas({
    address: zapRouter[chainId],
    abi: [zapRouterABI['15']],
    functionName: 'executeOrder',
    args: [config, route],
    value: isDolphinAddress(tokenIn.address) ? tokenIn.amount : 0n,
    account: userAddress
  })

  const { request } = await publicClient.simulateContract({
    address: zapRouter[chainId],
    abi: [zapRouterABI['15']],
    functionName: 'executeOrder',
    args: [config, route],
    value: isDolphinAddress(tokenIn.address) ? tokenIn.amount : 0n,
    account: userAddress,
    gas: (gasEstimate * parseUnits('1.2', 18)) / 10n ** 18n
  })

  const approval = !isDolphinAddress(tokenIn.address)
    ? { token: tokenIn.address, spender: zapTokenManager[chainId], amount: tokenIn.amount }
    : undefined

  return { request, gasEstimate, config, route, approval }
}
