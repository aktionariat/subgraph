import {
  AktionariatDayData,
  Brokerbot,
  BrokerbotDayData,
  BrokerbotHourData,
  Registry,
  Token,
  TokenDayData,
  TokenHourData
} from "../../generated/schema"
import { dataSource, ethereum, log } from '@graphprotocol/graph-ts'
import * as constants from "./common/constants";
import { convertToUsd } from "./helpers";

/**
 * Tracks global aggregate data over daily windows
 * @param event
 */
export function updateAktionariatDayData(event: ethereum.Event): AktionariatDayData {
  let registry = Registry.load(constants.BROKERBOT_REGISTRY_CONTRACT_ADDRESSES_MAP.get(dataSource.network())!.toHexString())
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400 // rounded
  let dayStartTimestamp = dayID * 86400
  let aktionariatDayData = AktionariatDayData.load(dayID.toString())
  if (aktionariatDayData === null) {
    aktionariatDayData = new AktionariatDayData(dayID.toString())
    aktionariatDayData.date = dayStartTimestamp
    aktionariatDayData.volumeXCHF = constants.BIGDECIMAL_ZERO
    aktionariatDayData.volumeUSD = constants.BIGDECIMAL_ZERO
  }
  aktionariatDayData.totalValueLockedUSD = registry!.totalValueLockedUSD
  aktionariatDayData.totalValueLockedXCHF = registry!.totalValueLockedXCHF
  aktionariatDayData.totalRaisedUSD = registry!.totalRaisedUSD
  aktionariatDayData.totalRaisedXCHF = registry!.totalRaisedXCHF
  aktionariatDayData.txCount = registry!.txCount
  aktionariatDayData.save()
  return aktionariatDayData as AktionariatDayData
}

export function updateBrokerbotDayData(event: ethereum.Event): BrokerbotDayData {
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let dayBrokerbotID = event.address
    .toHexString()
    .concat('-')
    .concat(dayID.toString())
  let brokerbot = Brokerbot.load(event.address.toHexString())
  let brokerbotDayData = BrokerbotDayData.load(dayBrokerbotID)
  if (brokerbot !== null) {
    if (brokerbotDayData === null) {
      brokerbotDayData = new BrokerbotDayData(dayBrokerbotID)
      brokerbotDayData.date = dayStartTimestamp
      brokerbotDayData.brokerbot = brokerbot.id
      // things that dont get initialized always
      brokerbotDayData.volumeBase = constants.BIGDECIMAL_ZERO
      brokerbotDayData.volumeToken = constants.BIGDECIMAL_ZERO
      brokerbotDayData.volumeUSD = constants.BIGDECIMAL_ZERO
      brokerbotDayData.volumeXCHF = constants.BIGDECIMAL_ZERO
      brokerbotDayData.txCount = constants.BIGINT_ZERO
      brokerbotDayData.open = brokerbot.tokenPrice
      brokerbotDayData.high = brokerbot.tokenPrice
      brokerbotDayData.low = brokerbot.tokenPrice
      brokerbotDayData.close = brokerbot.tokenPrice
    }

    if (brokerbot.tokenPrice.gt(brokerbotDayData.high)) {
      brokerbotDayData.high = brokerbot.tokenPrice
    }
    if (brokerbot.tokenPrice.lt(brokerbotDayData.low)) {
      brokerbotDayData.low = brokerbot.tokenPrice
    }

    brokerbotDayData.basePrice = brokerbot.basePrice
    brokerbotDayData.tokenPrice = brokerbot.tokenPrice
    brokerbotDayData.close = brokerbot.basePrice
    brokerbotDayData.priceUSD = convertToUsd(brokerbot.base, brokerbot.basePrice)
    brokerbotDayData.totalValueLockedUSD = brokerbot.totalValueLockedUSD
    brokerbotDayData.totalValueLockedXCHF = brokerbot.totalValueLockedXCHF
    brokerbotDayData.txCount = brokerbotDayData.txCount.plus(constants.BIGINT_ONE)
    brokerbotDayData.save()
  }

  return brokerbotDayData as BrokerbotDayData
}

export function updateBrokerbotHourData(event: ethereum.Event): BrokerbotHourData {
  let timestamp = event.block.timestamp.toI32()
  let hourIndex = timestamp / 3600 // get unique hour within unix history
  let hourStartUnix = hourIndex * 3600 // want the rounded effect
  let hourPoolID = event.address
    .toHexString()
    .concat('-')
    .concat(hourIndex.toString())
  let brokerbot = Brokerbot.load(event.address.toHexString())
  let brokerbotHourData = BrokerbotHourData.load(hourPoolID)
  if (brokerbot !== null) {

    if (brokerbotHourData === null) {
      brokerbotHourData = new BrokerbotHourData(hourPoolID)
      brokerbotHourData.periodStartUnix = hourStartUnix
      brokerbotHourData.brokerbot = brokerbot.id
      // things that dont get initialized always
      brokerbotHourData.volumeBase = constants.BIGDECIMAL_ZERO
      brokerbotHourData.volumeToken = constants.BIGDECIMAL_ZERO
      brokerbotHourData.volumeUSD = constants.BIGDECIMAL_ZERO
      brokerbotHourData.volumeXCHF = constants.BIGDECIMAL_ZERO
      brokerbotHourData.txCount = constants.BIGINT_ZERO
      brokerbotHourData.open = brokerbot.basePrice
      brokerbotHourData.high = brokerbot.basePrice
      brokerbotHourData.low = brokerbot.basePrice
      brokerbotHourData.close = brokerbot.basePrice
    }
    
    if (brokerbot.basePrice.gt(brokerbotHourData.high)) {
      brokerbotHourData.high = brokerbot.basePrice
    }
    if (brokerbot.basePrice.lt(brokerbotHourData.low)) {
      brokerbotHourData.low = brokerbot.basePrice
    }
    
    brokerbotHourData.basePrice = brokerbot.basePrice
    brokerbotHourData.tokenPrice = brokerbot.tokenPrice
    brokerbotHourData.close = brokerbot.basePrice
    brokerbotHourData.priceUSD = convertToUsd(brokerbot.base, brokerbot.basePrice)
    brokerbotHourData.totalValueLockedUSD = brokerbot.totalValueLockedUSD
    brokerbotHourData.totalValueLockedXCHF = brokerbot.totalValueLockedXCHF
    brokerbotHourData.txCount = brokerbotHourData.txCount.plus(constants.BIGINT_ONE)
    brokerbotHourData.save()
  }
    
  return brokerbotHourData as BrokerbotHourData
}

export function updateTokenDayData(token: Token, event: ethereum.Event): TokenDayData {
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let tokenDayID = token.id
    .toString()
    .concat('-')
    .concat(dayID.toString())
  let tokenPrice = token.derivedXCHF
  let tokenDayData = TokenDayData.load(tokenDayID)
  if (tokenDayData === null) {
    tokenDayData = new TokenDayData(tokenDayID)
    tokenDayData.date = dayStartTimestamp
    tokenDayData.token = token.id
    tokenDayData.volume = constants.BIGDECIMAL_ZERO
    tokenDayData.volumeUSD = constants.BIGDECIMAL_ZERO
    tokenDayData.volumeXCHF = constants.BIGDECIMAL_ZERO
    tokenDayData.open = tokenPrice
    tokenDayData.high = tokenPrice
    tokenDayData.low = tokenPrice
    tokenDayData.close = tokenPrice
  }

  if (tokenPrice.gt(tokenDayData.high)) {
    tokenDayData.high = tokenPrice
  }

  if (tokenPrice.lt(tokenDayData.low)) {
    tokenDayData.low = tokenPrice
  }

  let xchfAddress = constants.WHITELIST_TOKENS_MAP.get(dataSource.network())!.get("XCHF")!;
  tokenDayData.close = tokenPrice
  tokenDayData.priceUSD = convertToUsd(xchfAddress.toHexString(), tokenPrice)
  tokenDayData.priceXCHF = tokenPrice
  tokenDayData.totalValueLocked = token.totalValueLocked
  tokenDayData.totalValueLockedUSD = token.totalValueLockedUSD
  tokenDayData.totalValueLockedXCHF = token.totalValueLockedXCHF
  tokenDayData.save()

  return tokenDayData as TokenDayData
}

export function updateTokenHourData(token: Token, event: ethereum.Event): TokenHourData {
  let timestamp = event.block.timestamp.toI32()
  let hourIndex = timestamp / 3600 // get unique hour within unix history
  let hourStartUnix = hourIndex * 3600 // want the rounded effect
  let tokenHourID = token.id
    .toString()
    .concat('-')
    .concat(hourIndex.toString())
  let tokenHourData = TokenHourData.load(tokenHourID)
  let tokenPrice = token.derivedXCHF

  if (tokenHourData === null) {
    tokenHourData = new TokenHourData(tokenHourID)
    tokenHourData.periodStartUnix = hourStartUnix
    tokenHourData.token = token.id
    tokenHourData.volume = constants.BIGDECIMAL_ZERO
    tokenHourData.volumeUSD = constants.BIGDECIMAL_ZERO
    tokenHourData.volumeXCHF = constants.BIGDECIMAL_ZERO
    tokenHourData.open = tokenPrice
    tokenHourData.high = tokenPrice
    tokenHourData.low = tokenPrice
    tokenHourData.close = tokenPrice
  }

  if (tokenPrice.gt(tokenHourData.high)) {
    tokenHourData.high = tokenPrice
  }

  if (tokenPrice.lt(tokenHourData.low)) {
    tokenHourData.low = tokenPrice
  }

  let xchfAddress = constants.WHITELIST_TOKENS_MAP.get(dataSource.network())!.get("XCHF")!;
  tokenHourData.close = tokenPrice
  tokenHourData.priceUSD = convertToUsd(xchfAddress.toHexString(), tokenPrice)
  tokenHourData.priceXCHF = tokenPrice
  tokenHourData.totalValueLocked = token.totalValueLocked
  tokenHourData.totalValueLockedUSD = token.totalValueLockedUSD
  tokenHourData.totalValueLockedXCHF = token.totalValueLockedXCHF
  tokenHourData.save()

  return tokenHourData as TokenHourData
}