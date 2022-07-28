/* eslint-disable prefer-const */
import { log, BigInt, BigDecimal, Address, dataSource } from '@graphprotocol/graph-ts'
import { ERC20 } from '../../generated/BrokerbotRegistry/ERC20'
import { ERC20SymbolBytes } from '../../generated/BrokerbotRegistry/ERC20SymbolBytes'
import { ERC20NameBytes } from '../../generated/BrokerbotRegistry/ERC20NameBytes'
import { AggregatorV3Interface } from '../../generated/BrokerbotRegistry/AggregatorV3Interface'
import { Shares } from '../../generated/BrokerbotRegistry/Shares'
import { ERC20Draggable } from '../../generated/BrokerbotRegistry/ERC20Draggable'
import { Brokerbot as BrokerbotContract } from '../../generated/BrokerbotRegistry/Brokerbot'
import { StaticTokenDefinition } from '../staticTokenDefinition'
import {   
  Brokerbot,
  Registry,
  Token
} from "../../generated/schema"
import { Brokerbot as BrokerbotTemplate } from "../../generated/templates"
import * as constants from "./common/constants";
import { CustomPriceType } from "./common/types";
import { getPriceDai as getPriceDaiUniswap } from "./quoters/UniswapQuoter";

export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
export const OWNER_ADDRESS = '0xbddE35780e3986a47e54a580017d8213f0D2bB84'
export const REGISTRY_ADDRESS = Address.fromString(constants.BROKERBOT_REGISTRY_CONTRACT_ADDRESSES_MAP.get(dataSource.network())!.toHexString())
export const CHAINLINK_FEED_REGISTRY_ADDRESS:Address = Address.fromString("0x449d117117838fFA61263B61dA6301AA2a88B13A")
//export const CHAINLINK_FEED_REGISTRY_ADDRESS:Address = Address.fromString("0x47Fb2585D2C56Fe188D0E6ec628a38b74fCeeeDf")
export const CHAIN_LINK_USD_ADDRESS = Address.fromString("0x0000000000000000000000000000000000000348")
export const CHAIN_LINK_CHF_ADDRESS = new Address(756)
export const XCHF_ADDRESS = Address.fromString("0xB4272071eCAdd69d933AdcD19cA99fe80664fc08")


export let ZERO_BI = BigInt.fromI32(0)
export let ONE_BI = BigInt.fromI32(1)
export let ZERO_BD = BigDecimal.fromString('0')
export let ONE_BD = BigDecimal.fromString('1')
export let BI_18 = BigInt.fromI32(18)

export class Entities {
  registry: Registry
  brokerbot: Brokerbot
  base: Token
  token: Token
  constructor(_r:Registry, _m:Brokerbot, _b:Token, _t:Token){
    this.registry = _r 
    this.brokerbot = _m
    this.base = _b
    this.token = _t
  }
}

export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
  let bd = BigDecimal.fromString('1')
  for (let i = ZERO_BI; i.lt(decimals as BigInt); i = i.plus(ONE_BI)) {
    bd = bd.times(BigDecimal.fromString('10'))
  }
  return bd
}

export function bigDecimalExp18(): BigDecimal {
  return BigDecimal.fromString('1000000000000000000')
}

export function convertEthToDecimal(eth: BigInt): BigDecimal {
  return eth.toBigDecimal().div(exponentToBigDecimal(18))
}

export function convertTokenToDecimal(tokenAmount: BigInt, exchangeDecimals: BigInt): BigDecimal {
  if (exchangeDecimals == ZERO_BI) {
    return tokenAmount.toBigDecimal()
  }
  return tokenAmount.toBigDecimal().div(exponentToBigDecimal(exchangeDecimals))
}

export function equalToZero(value: BigDecimal): boolean {
  const formattedVal = parseFloat(value.toString())
  const zero = parseFloat(ZERO_BD.toString())
  if (zero == formattedVal) {
    return true
  }
  return false
}

export function isNullEthValue(value: string): boolean {
  return value == '0x0000000000000000000000000000000000000000000000000000000000000001'
}

export function fetchTokenSymbol(tokenAddress: Address): string {
  let contract = ERC20.bind(tokenAddress)
  let contractSymbolBytes = ERC20SymbolBytes.bind(tokenAddress)

  // try types string and bytes32 for symbol
  let symbolValue = 'unknown'
  let symbolResult = contract.try_symbol()
  if (symbolResult.reverted) {
    let symbolResultBytes = contractSymbolBytes.try_symbol()
    if (!symbolResultBytes.reverted) {
      // for broken pairs that have no symbol function exposed
      if (!isNullEthValue(symbolResultBytes.value.toHexString())) {
        symbolValue = symbolResultBytes.value.toString()
      } else {
        // try with the static definition
        let staticTokenDefinition = StaticTokenDefinition.fromAddress(tokenAddress)
        if(staticTokenDefinition != null) {
          symbolValue = staticTokenDefinition.symbol
        }
      }
    }
  } else {
    symbolValue = symbolResult.value
  }

  return symbolValue
}

export function fetchTokenName(tokenAddress: Address): string {
  let contract = ERC20.bind(tokenAddress)
  let contractNameBytes = ERC20NameBytes.bind(tokenAddress)

  // try types string and bytes32 for name
  let nameValue = 'unknown'
  let nameResult = contract.try_name()
  if (nameResult.reverted) {
    let nameResultBytes = contractNameBytes.try_name()
    if (!nameResultBytes.reverted) {
      // for broken exchanges that have no name function exposed
      if (!isNullEthValue(nameResultBytes.value.toHexString())) {
        nameValue = nameResultBytes.value.toString()
      } else {
        // try with the static definition
        let staticTokenDefinition = StaticTokenDefinition.fromAddress(tokenAddress)
        if(staticTokenDefinition != null) {
          nameValue = staticTokenDefinition.name
        }
      }
    }
  } else {
    nameValue = nameResult.value
  }

  return nameValue
}

export function fetchTokenTotalSupply(tokenAddress: Address): BigInt {
  let contract = ERC20.bind(tokenAddress)
  let totalSupplyValue = BigInt.fromI32(0)
  let totalSupplyResult = contract.try_totalSupply()
  if (!totalSupplyResult.reverted) {
    totalSupplyValue = totalSupplyResult.value
  }
  return totalSupplyValue
}

export function fetchTokenBalance(tokenAddress: Address, account: Address): BigInt {
  let contract = ERC20.bind(tokenAddress)
  let balanceValue = BigInt.fromI32(0)
  let balanceResult = contract.try_balanceOf(account)
  if (!balanceResult.reverted) {
    balanceValue = balanceResult.value
  }
  return balanceValue
}

export function fetchTokenDecimals(tokenAddress: Address): BigInt {
  let contract = ERC20.bind(tokenAddress)
  // try types uint8 for decimals
  let decimalValue = 0
  let decimalResult = contract.try_decimals()
  if (!decimalResult.reverted) {
    decimalValue = decimalResult.value
  } else {
    // try with the static definition
    let staticTokenDefinition = StaticTokenDefinition.fromAddress(tokenAddress)
    if(staticTokenDefinition != null) {
      return staticTokenDefinition.decimals
    }
  }
  return BigInt.fromI32(decimalValue as i32)
}

export function fetchTokenTotalShares(tokenAddress: Address): BigInt {
  let shares = Shares.bind(tokenAddress)
  let totalSharesValue = BigInt.fromI32(0)
  let totalSharesResult = shares.try_totalShares()
  if (!totalSharesResult.reverted) {
    totalSharesValue = totalSharesResult.value
  } else {
    let draggable = ERC20Draggable.bind(tokenAddress)
    totalSharesResult = draggable.try_totalVotingTokens()
    if (!totalSharesResult.reverted) {
      totalSharesValue = totalSharesResult.value
      //log.error("total shares: %s", [totalSharesValue.toString()])
    }
  }
  return totalSharesValue
}

export function fetchBrokerbotBasePrice(brokerbotAddress: Address): BigInt {
  let brokerbot = BrokerbotContract.bind(brokerbotAddress)
  let priceValue = BigInt.fromI32(0)
  let priceResult = brokerbot.try_getPrice()
  if (!priceResult.reverted) {
    priceValue = priceResult.value
  }
  return priceValue
}

export function convertToUsd(tokenAddress: string, value: BigDecimal): BigDecimal {
  let network = dataSource.network();
  // mainnet gets price thru chainlink feed
  if (network == 'mainnet') {
    let priceFeedRegitryContract = AggregatorV3Interface.bind(CHAINLINK_FEED_REGISTRY_ADDRESS)
    if (tokenAddress == XCHF_ADDRESS.toHexString()) {
    // tokenAddress = CHAIN_LINK_CHF_ADDRESS
    }
    // Returns the latest price of chf/usd pair from chainlink with 8 decimals
    let result = priceFeedRegitryContract.try_latestRoundData()
    if (!result.reverted) {
      let resultInDecimals = new BigDecimal(result.value.value1).div(BigDecimal.fromString("100000000"))
      return value.div(resultInDecimals)
    }
    log.warning('got reverted {} address: {}', [result.reverted.toString(), tokenAddress])
    return value    
  } else {
    // other networks (optimism) gets price over uniswap
    let price = getUsdPricePerToken(Address.fromString(tokenAddress))
    let decimalPrice = price.usdPrice.div(price.decimalsBaseTen)
    //log.warning("usd price : {}", [decimalPrice.toString()])
    return value.times(decimalPrice)
  }
}

export function convertToChf(tokenAddress: Address, value: BigDecimal): BigDecimal {
  let network = dataSource.network();
  if (tokenAddress == constants.WHITELIST_TOKENS_MAP.get(network)!.get("XCHF")!) {
    return value
  } 
  // TODO: convert from other tokens
  return value
}

export function getRegistry(registryAddress: string): Registry {
  let registry = Registry.load(registryAddress)
  if (registry === null) {
    registry = new Registry(registryAddress)
    registry.marketCount = ZERO_BI
    registry.txCount = ZERO_BI
    registry.totalValueLockedUSD = ZERO_BD
    registry.totalValueLockedXCHF = ZERO_BD
    registry.totalVolumeUSD = ZERO_BD
    registry.totalVolumeXCHF = ZERO_BD
  }
  return registry;
}

export function getEntities(
  registryAddress: Address,
  marketAddress: Address, 
  baseAddress: Address, 
  tokenAddress: Address
  ): Entities {
  

  // load registry
  let registry = getRegistry(registryAddress.toHexString())

  // load market
  let brokerbot = Brokerbot.load(marketAddress.toHexString())
  if (brokerbot === null) {
    BrokerbotTemplate.create(marketAddress)
    brokerbot = new Brokerbot(marketAddress.toHexString())
    brokerbot.base = baseAddress.toHexString()
    brokerbot.token = tokenAddress.toHexString()
    registry.marketCount = registry.marketCount.plus(ONE_BI)
  }

  // load the tokens
  let base = Token.load(brokerbot.base)
  let token = Token.load(brokerbot.token)

  //fetch info if null
  if (base === null) {
    base = new Token(baseAddress.toHexString())
    base.symbol = fetchTokenSymbol(baseAddress)
    base.name = fetchTokenName(baseAddress)
    base.totalSupply = fetchTokenTotalSupply(baseAddress)
    base.decimals = fetchTokenDecimals(baseAddress)

    base.derivedXCHF = ZERO_BD
    base.tradeVolume = ZERO_BD
    base.tradeVolumeUSD = ZERO_BD
    base.totalValueLocked = ZERO_BD
    base.txCount = ZERO_BI
  }

  //fetch info if null
  if (token === null) {
    token = new Token(tokenAddress.toHexString())
    token.symbol = fetchTokenSymbol(tokenAddress)
    token.name = fetchTokenName(tokenAddress)
    token.totalSupply = fetchTokenTotalSupply(tokenAddress)
    token.decimals = fetchTokenDecimals(tokenAddress)

    token.derivedXCHF = ZERO_BD
    token.tradeVolume = ZERO_BD
    token.tradeVolumeUSD = ZERO_BD
    token.totalValueLocked = ZERO_BD
    token.txCount = ZERO_BI
  }
  const entities  = new Entities(registry,brokerbot,base,token)
  return entities
}


export function getUsdPricePerToken(tokenAddr: Address): CustomPriceType {
  // Check if tokenAddr is a NULL Address
  if (tokenAddr.toHex() == constants.ZERO_ADDRESS_STRING) {
    return new CustomPriceType();
  }

  let network = dataSource.network();

  // Uniswap Quoter
  let uniswapPrice = getPriceDaiUniswap(tokenAddr, network);
  if (!uniswapPrice.reverted) {
    //log.warning("[UniswapQuoter] tokenAddress: {}, Price: {}", [
    //  tokenAddr.toHexString(),
    //  uniswapPrice.usdPrice.div(uniswapPrice.decimalsBaseTen).toString(),
    //]);
    return uniswapPrice;
  }

  log.warning("[Oracle] Failed to Fetch Price, tokenAddr: {}", [tokenAddr.toHexString()]);

  return new CustomPriceType();
}

