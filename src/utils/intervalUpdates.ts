import {
  AktionariatWeekData,
  AktionariatDayData,
  Brokerbot,
  BrokerbotDayData,
  BrokerbotHourData,
  Registry,
  Token,
  Swap,
  TokenDayData,
  TokenHourData,
  BrokerbotWeekData,
  TokenWeekData
} from "../../generated/schema"
import { dataSource, ethereum, log } from '@graphprotocol/graph-ts'
import * as constants from "./common/constants";
import { ZERO_BD, convertToUsd } from "./helpers";

/**
 * Tracks global aggregate data over daily windows
 * @param event
 */
export function updateAktionariatWeekData(event: ethereum.Event, swap:Swap): AktionariatWeekData {
  let registry = Registry.load(constants.BROKERBOT_REGISTRY_CONTRACT_ADDRESSES_MAP.get(dataSource.network())!.toHexString())
  let timestamp = event.block.timestamp.toI32()
  let weekID = timestamp / 604800 // rounded
  let weekStartTimestamp = weekID * 604800
  let aktionariatWeekData = AktionariatWeekData.load(weekID.toString())
  if (aktionariatWeekData === null) {
    aktionariatWeekData = new AktionariatWeekData(weekID.toString())
    aktionariatWeekData.date = weekStartTimestamp
    aktionariatWeekData.volumeCHF = constants.BIGDECIMAL_ZERO
    aktionariatWeekData.volumeUSD = constants.BIGDECIMAL_ZERO
    aktionariatWeekData.txCount = constants.BIGINT_ZERO
  }
  aktionariatWeekData.totalValueLockedUSD = registry!.totalValueLockedUSD
  aktionariatWeekData.totalValueLockedCHF = registry!.totalValueLockedCHF
  aktionariatWeekData.totalRaisedUSD = registry!.totalRaisedUSD
  aktionariatWeekData.totalRaisedCHF = registry!.totalRaisedCHF
  aktionariatWeekData.liquidityCHF = registry!.liquidityCHF
  aktionariatWeekData.liquidityUSD = registry!.liquidityUSD
  aktionariatWeekData.txCount = aktionariatWeekData.txCount.plus(constants.BIGINT_ONE)
  // update volume metrics
  aktionariatWeekData.volumeCHF = aktionariatWeekData.volumeCHF.plus(swap.amountCHF)
  aktionariatWeekData.volumeUSD = aktionariatWeekData.volumeUSD.plus(swap.amountUSD)
  aktionariatWeekData.save()
  return aktionariatWeekData as AktionariatWeekData
}

export function updateAktionariatDayData(event: ethereum.Event, swap:Swap): AktionariatDayData {
  let registry = Registry.load(constants.BROKERBOT_REGISTRY_CONTRACT_ADDRESSES_MAP.get(dataSource.network())!.toHexString())
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400 // rounded
  let dayStartTimestamp = dayID * 86400
  let aktionariatDayData = AktionariatDayData.load(dayID.toString())
  if (aktionariatDayData === null) {
    aktionariatDayData = new AktionariatDayData(dayID.toString())
    aktionariatDayData.date = dayStartTimestamp
    aktionariatDayData.volumeCHF = constants.BIGDECIMAL_ZERO
    aktionariatDayData.volumeUSD = constants.BIGDECIMAL_ZERO
    aktionariatDayData.txCount = constants.BIGINT_ZERO
  }
  aktionariatDayData.totalValueLockedUSD = registry!.totalValueLockedUSD
  aktionariatDayData.totalValueLockedCHF = registry!.totalValueLockedCHF
  aktionariatDayData.totalRaisedUSD = registry!.totalRaisedUSD
  aktionariatDayData.totalRaisedCHF = registry!.totalRaisedCHF
  aktionariatDayData.liquidityCHF = registry!.liquidityCHF
  aktionariatDayData.liquidityUSD = registry!.liquidityUSD
  aktionariatDayData.txCount = aktionariatDayData.txCount.plus(constants.BIGINT_ONE)
  // update volume metrics
  aktionariatDayData.volumeCHF = aktionariatDayData.volumeCHF.plus(swap.amountCHF)
  aktionariatDayData.volumeUSD = aktionariatDayData.volumeUSD.plus(swap.amountUSD)
  aktionariatDayData.save()
  return aktionariatDayData as AktionariatDayData
}

export function updateBrokerbotWeekData(event: ethereum.Event, swap:Swap): BrokerbotWeekData {
  let timestamp = event.block.timestamp.toI32()
  let weekID = timestamp / 604800
  let dayStartTimestamp = weekID * 604800
  let weekBrokerbotID = event.address
    .toHexString()
    .concat('-')
    .concat(weekID.toString())
  let brokerbot = Brokerbot.load(event.address.toHexString())
  let brokerbotWeekData = BrokerbotWeekData.load(weekBrokerbotID)
  if (brokerbot !== null) {
    if (brokerbotWeekData === null) {
      brokerbotWeekData = new BrokerbotWeekData(weekBrokerbotID)
      brokerbotWeekData.date = dayStartTimestamp
      brokerbotWeekData.brokerbot = brokerbot.id
      // things that dont get initialized always
      brokerbotWeekData.volumeBase = constants.BIGDECIMAL_ZERO
      brokerbotWeekData.volumeToken = constants.BIGDECIMAL_ZERO
      brokerbotWeekData.volumeUSD = constants.BIGDECIMAL_ZERO
      brokerbotWeekData.volumeCHF = constants.BIGDECIMAL_ZERO
      brokerbotWeekData.liquidityUSD = constants.BIGDECIMAL_ZERO
      brokerbotWeekData.liquidityCHF = constants.BIGDECIMAL_ZERO
      brokerbotWeekData.txCount = constants.BIGINT_ZERO
      brokerbotWeekData.open = brokerbot.tokenPrice
      brokerbotWeekData.high = brokerbot.tokenPrice
      brokerbotWeekData.low = brokerbot.tokenPrice
      brokerbotWeekData.close = brokerbot.tokenPrice
    }

    if (brokerbot.tokenPrice.gt(brokerbotWeekData.high)) {
      brokerbotWeekData.high = brokerbot.tokenPrice
    }
    if (brokerbot.tokenPrice.lt(brokerbotWeekData.low)) {
      brokerbotWeekData.low = brokerbot.tokenPrice
    }

    brokerbotWeekData.basePrice = brokerbot.basePrice
    brokerbotWeekData.tokenPrice = brokerbot.tokenPrice
    brokerbotWeekData.close = brokerbot.basePrice
    brokerbotWeekData.priceUSD = brokerbot.priceUSD
    brokerbotWeekData.priceCHF = brokerbot.priceCHF
    brokerbotWeekData.totalValueLockedUSD = brokerbot.totalValueLockedUSD
    brokerbotWeekData.totalValueLockedCHF = brokerbot.totalValueLockedCHF
    brokerbotWeekData.liquidityUSD = brokerbot.liquidityUSD
    brokerbotWeekData.liquidityCHF = brokerbot.liquidityCHF
    if (swap.amountCHF > constants.BIGDECIMAL_ZERO)
      brokerbotWeekData.txCount = brokerbotWeekData.txCount.plus(constants.BIGINT_ONE)
    // update volume metrics
    brokerbotWeekData.volumeBase = brokerbotWeekData.volumeBase.plus(swap.amountBase)
    brokerbotWeekData.volumeToken = brokerbotWeekData.volumeToken.plus(swap.amountToken)
    brokerbotWeekData.volumeUSD = brokerbotWeekData.volumeUSD.plus(swap.amountUSD)
    brokerbotWeekData.volumeCHF = brokerbotWeekData.volumeCHF.plus(swap.amountCHF)
    brokerbotWeekData.save()
  }

  return brokerbotWeekData as BrokerbotWeekData
}

export function updateBrokerbotDayData(event: ethereum.Event, swap:Swap): BrokerbotDayData {
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
      brokerbotDayData.volumeCHF = constants.BIGDECIMAL_ZERO
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
    brokerbotDayData.priceUSD = brokerbot.priceUSD
    brokerbotDayData.priceCHF = brokerbot.priceCHF
    brokerbotDayData.totalValueLockedUSD = brokerbot.totalValueLockedUSD
    brokerbotDayData.totalValueLockedCHF = brokerbot.totalValueLockedCHF
    brokerbotDayData.liquidityCHF = brokerbot.liquidityCHF
    brokerbotDayData.liquidityUSD = brokerbot.liquidityUSD
    if (swap.amountCHF > constants.BIGDECIMAL_ZERO)
      brokerbotDayData.txCount = brokerbotDayData.txCount.plus(constants.BIGINT_ONE)
    // update volume metrics
    brokerbotDayData.volumeBase = brokerbotDayData.volumeBase.plus(swap.amountBase)
    brokerbotDayData.volumeToken = brokerbotDayData.volumeToken.plus(swap.amountToken)
    brokerbotDayData.volumeUSD = brokerbotDayData.volumeUSD.plus(swap.amountUSD)
    brokerbotDayData.volumeCHF = brokerbotDayData.volumeCHF.plus(swap.amountCHF)
    brokerbotDayData.save()
  }

  return brokerbotDayData as BrokerbotDayData
}

export function updateBrokerbotHourData(event: ethereum.Event, swap:Swap): BrokerbotHourData {
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
      brokerbotHourData.volumeCHF = constants.BIGDECIMAL_ZERO
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
    brokerbotHourData.priceUSD = brokerbot.priceUSD
    brokerbotHourData.priceCHF = brokerbot.priceCHF
    brokerbotHourData.totalValueLockedUSD = brokerbot.totalValueLockedUSD
    brokerbotHourData.totalValueLockedCHF = brokerbot.totalValueLockedCHF
    brokerbotHourData.liquidityCHF = brokerbot.liquidityCHF
    brokerbotHourData.liquidityUSD = brokerbot.liquidityUSD
    if (swap.amountCHF > constants.BIGDECIMAL_ZERO)
      brokerbotHourData.txCount = brokerbotHourData.txCount.plus(constants.BIGINT_ONE)
    // update volume metrics  
    brokerbotHourData.volumeBase = brokerbotHourData.volumeBase.plus(swap.amountBase)
    brokerbotHourData.volumeToken = brokerbotHourData.volumeToken.plus(swap.amountToken)
    brokerbotHourData.volumeUSD = brokerbotHourData.volumeUSD.plus(swap.amountUSD)
    brokerbotHourData.volumeCHF = brokerbotHourData.volumeCHF.plus(swap.amountCHF)
    brokerbotHourData.save()
  }
    
  return brokerbotHourData as BrokerbotHourData
}

export function updateTokenWeekData(token: Token, event: ethereum.Event, swap:Swap): TokenWeekData {
  let timestamp = event.block.timestamp.toI32()
  let weekID = timestamp / 604800
  let dayStartTimestamp = weekID * 604800
  let tokenDayID = token.id
    .toString()
    .concat('-')
    .concat(weekID.toString())
  let tokenPrice = token.derivedCHF
  let tokenWeekData = TokenWeekData.load(tokenDayID)
  if (tokenWeekData === null) {
    tokenWeekData = new TokenWeekData(tokenDayID)
    tokenWeekData.date = dayStartTimestamp
    tokenWeekData.token = token.id
    tokenWeekData.volume = constants.BIGDECIMAL_ZERO
    tokenWeekData.volumeUSD = constants.BIGDECIMAL_ZERO
    tokenWeekData.volumeCHF = constants.BIGDECIMAL_ZERO
    tokenWeekData.open = tokenPrice
    tokenWeekData.high = tokenPrice
    tokenWeekData.low = tokenPrice
    tokenWeekData.close = tokenPrice
    tokenWeekData.raisedCHF = ZERO_BD
    tokenWeekData.raisedUSD = ZERO_BD
  }

  if (tokenPrice.gt(tokenWeekData.high)) {
    tokenWeekData.high = tokenPrice
  }

  if (tokenPrice.lt(tokenWeekData.low)) {
    tokenWeekData.low = tokenPrice
  }

  tokenWeekData.close = tokenPrice
  tokenWeekData.priceUSD = token.derivedUSD
  tokenWeekData.priceCHF = token.derivedCHF
  tokenWeekData.totalValueLocked = token.totalValueLocked
  tokenWeekData.totalValueLockedUSD = token.totalValueLockedUSD
  tokenWeekData.totalValueLockedCHF = token.totalValueLockedCHF
  // update volmue metrics
  tokenWeekData.volume = tokenWeekData.volume.plus(swap.amountToken)
  tokenWeekData.volumeUSD = tokenWeekData.volumeUSD.plus(swap.amountUSD)
  tokenWeekData.volumeCHF = tokenWeekData.volumeCHF.plus(swap.amountCHF)
  // liqudity metrics
  tokenWeekData.liquidityCHF = token.liquidityCHF
  tokenWeekData.liquidityUSD = token.liquidityUSD
  // raised metrics
  if (swap.isBuy) {
    tokenWeekData.raisedCHF = tokenWeekData.raisedCHF.plus(swap.amountCHF)
    tokenWeekData.raisedUSD = tokenWeekData.raisedUSD.plus(swap.amountUSD)
  } else {
    tokenWeekData.raisedCHF = tokenWeekData.raisedCHF.minus(swap.amountCHF)
    tokenWeekData.raisedUSD = tokenWeekData.raisedUSD.minus(swap.amountUSD)
  }
  tokenWeekData.save()

  return tokenWeekData as TokenWeekData
}

export function updateTokenDayData(token: Token, event: ethereum.Event, swap:Swap): TokenDayData {
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let tokenDayID = token.id
    .toString()
    .concat('-')
    .concat(dayID.toString())
  let tokenPrice = token.derivedCHF
  let tokenDayData = TokenDayData.load(tokenDayID)
  if (tokenDayData === null) {
    tokenDayData = new TokenDayData(tokenDayID)
    tokenDayData.date = dayStartTimestamp
    tokenDayData.token = token.id
    tokenDayData.volume = constants.BIGDECIMAL_ZERO
    tokenDayData.volumeUSD = constants.BIGDECIMAL_ZERO
    tokenDayData.volumeCHF = constants.BIGDECIMAL_ZERO
    tokenDayData.open = tokenPrice
    tokenDayData.high = tokenPrice
    tokenDayData.low = tokenPrice
    tokenDayData.close = tokenPrice
    tokenDayData.raisedCHF = ZERO_BD
    tokenDayData.raisedUSD = ZERO_BD
  }

  if (tokenPrice.gt(tokenDayData.high)) {
    tokenDayData.high = tokenPrice
  }

  if (tokenPrice.lt(tokenDayData.low)) {
    tokenDayData.low = tokenPrice
  }

  tokenDayData.close = tokenPrice
  tokenDayData.priceUSD = token.derivedUSD
  tokenDayData.priceCHF = token.derivedCHF
  tokenDayData.totalValueLocked = token.totalValueLocked
  tokenDayData.totalValueLockedUSD = token.totalValueLockedUSD
  tokenDayData.totalValueLockedCHF = token.totalValueLockedCHF
  // update volume metrics  
  tokenDayData.volume = tokenDayData.volume.plus(swap.amountBase)
  tokenDayData.volumeUSD = tokenDayData.volumeUSD.plus(swap.amountUSD)
  tokenDayData.volumeCHF = tokenDayData.volumeCHF.plus(swap.amountCHF)
  // liqudity metrics
  tokenDayData.liquidityCHF = token.liquidityCHF
  tokenDayData.liquidityUSD = token.liquidityUSD
  // raised metrics
  if (swap.isBuy) {
    tokenDayData.raisedCHF = tokenDayData.raisedCHF.plus(swap.amountCHF)
    tokenDayData.raisedUSD = tokenDayData.raisedUSD.plus(swap.amountUSD)
  } else {
    tokenDayData.raisedCHF = tokenDayData.raisedCHF.minus(swap.amountCHF)
    tokenDayData.raisedUSD = tokenDayData.raisedUSD.minus(swap.amountUSD)
  }
  tokenDayData.save()

  return tokenDayData as TokenDayData
}

export function updateTokenHourData(token: Token, event: ethereum.Event, swap:Swap): TokenHourData {
  let timestamp = event.block.timestamp.toI32()
  let hourIndex = timestamp / 3600 // get unique hour within unix history
  let hourStartUnix = hourIndex * 3600 // want the rounded effect
  let tokenHourID = token.id
    .toString()
    .concat('-')
    .concat(hourIndex.toString())
  let tokenHourData = TokenHourData.load(tokenHourID)
  let tokenPrice = token.derivedCHF

  if (tokenHourData === null) {
    tokenHourData = new TokenHourData(tokenHourID)
    tokenHourData.periodStartUnix = hourStartUnix
    tokenHourData.token = token.id
    tokenHourData.volume = constants.BIGDECIMAL_ZERO
    tokenHourData.volumeUSD = constants.BIGDECIMAL_ZERO
    tokenHourData.volumeCHF = constants.BIGDECIMAL_ZERO
    tokenHourData.open = tokenPrice
    tokenHourData.high = tokenPrice
    tokenHourData.low = tokenPrice
    tokenHourData.close = tokenPrice
    tokenHourData.raisedCHF = ZERO_BD
    tokenHourData.raisedUSD = ZERO_BD
  }

  if (tokenPrice.gt(tokenHourData.high)) {
    tokenHourData.high = tokenPrice
  }

  if (tokenPrice.lt(tokenHourData.low)) {
    tokenHourData.low = tokenPrice
  }

  tokenHourData.close = tokenPrice
  tokenHourData.priceUSD = token.derivedUSD
  tokenHourData.priceCHF = token.derivedCHF
  tokenHourData.totalValueLocked = token.totalValueLocked
  tokenHourData.totalValueLockedUSD = token.totalValueLockedUSD
  tokenHourData.totalValueLockedCHF = token.totalValueLockedCHF
  // update volume metrics
  tokenHourData.volume = tokenHourData.volume.plus(swap.amountToken)
  tokenHourData.volumeUSD = tokenHourData.volumeUSD.plus(swap.amountUSD)
  tokenHourData.volumeCHF = tokenHourData.volumeCHF.plus(swap.amountCHF)
  // liqudity metrics
  tokenHourData.liquidityCHF = token.liquidityCHF
  tokenHourData.liquidityUSD = token.liquidityUSD
  // raised metrics
  if (swap.isBuy) {
    tokenHourData.raisedCHF = tokenHourData.raisedCHF.plus(swap.amountCHF)
    tokenHourData.raisedUSD = tokenHourData.raisedUSD.plus(swap.amountUSD)
  } else {
    tokenHourData.raisedCHF = tokenHourData.raisedCHF.minus(swap.amountCHF)
    tokenHourData.raisedUSD = tokenHourData.raisedUSD.minus(swap.amountUSD)
  }
  tokenHourData.save()

  return tokenHourData as TokenHourData
}