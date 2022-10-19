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
import { convertToUsd } from "./helpers";

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
    aktionariatWeekData.volumeXCHF = constants.BIGDECIMAL_ZERO
    aktionariatWeekData.volumeUSD = constants.BIGDECIMAL_ZERO
  }
  aktionariatWeekData.totalValueLockedUSD = registry!.totalValueLockedUSD
  aktionariatWeekData.totalValueLockedXCHF = registry!.totalValueLockedXCHF
  aktionariatWeekData.totalRaisedUSD = registry!.totalRaisedUSD
  aktionariatWeekData.totalRaisedXCHF = registry!.totalRaisedXCHF
  aktionariatWeekData.liquidityXCHF = registry!.liquidityXCHF
  aktionariatWeekData.liquidityUSD = registry!.liquidityUSD
  aktionariatWeekData.txCount = registry!.txCount
  // update volume metrics
  aktionariatWeekData.volumeXCHF = aktionariatWeekData.volumeXCHF.plus(swap.amountXCHF)
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
    aktionariatDayData.volumeXCHF = constants.BIGDECIMAL_ZERO
    aktionariatDayData.volumeUSD = constants.BIGDECIMAL_ZERO
  }
  aktionariatDayData.totalValueLockedUSD = registry!.totalValueLockedUSD
  aktionariatDayData.totalValueLockedXCHF = registry!.totalValueLockedXCHF
  aktionariatDayData.totalRaisedUSD = registry!.totalRaisedUSD
  aktionariatDayData.totalRaisedXCHF = registry!.totalRaisedXCHF
  aktionariatDayData.liquidityXCHF = registry!.liquidityXCHF
  aktionariatDayData.liquidityUSD = registry!.liquidityUSD
  aktionariatDayData.txCount = registry!.txCount
  // update volume metrics
  aktionariatDayData.volumeXCHF = aktionariatDayData.volumeXCHF.plus(swap.amountXCHF)
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
      brokerbotWeekData.volumeXCHF = constants.BIGDECIMAL_ZERO
      brokerbotWeekData.liquidityUSD = constants.BIGDECIMAL_ZERO
      brokerbotWeekData.liquidityXCHF = constants.BIGDECIMAL_ZERO
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
    brokerbotWeekData.priceXCHF = brokerbot.priceXCHF
    brokerbotWeekData.totalValueLockedUSD = brokerbot.totalValueLockedUSD
    brokerbotWeekData.totalValueLockedXCHF = brokerbot.totalValueLockedXCHF
    brokerbotWeekData.liquidityUSD = brokerbot.liquidityUSD
    brokerbotWeekData.liquidityXCHF = brokerbot.liquidityXCHF
    brokerbotWeekData.txCount = brokerbotWeekData.txCount.plus(constants.BIGINT_ONE)
    // update volume metrics
    brokerbotWeekData.volumeBase = brokerbotWeekData.volumeBase.plus(swap.amountBase)
    brokerbotWeekData.volumeToken = brokerbotWeekData.volumeToken.plus(swap.amountToken)
    brokerbotWeekData.volumeUSD = brokerbotWeekData.volumeUSD.plus(swap.amountUSD)
    brokerbotWeekData.volumeXCHF = brokerbotWeekData.volumeXCHF.plus(swap.amountXCHF)
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
    brokerbotDayData.priceUSD = brokerbot.priceUSD
    brokerbotDayData.priceXCHF = brokerbot.priceXCHF
    brokerbotDayData.totalValueLockedUSD = brokerbot.totalValueLockedUSD
    brokerbotDayData.totalValueLockedXCHF = brokerbot.totalValueLockedXCHF
    brokerbotDayData.liquidityXCHF = brokerbot.liquidityXCHF
    brokerbotDayData.liquidityUSD = brokerbot.liquidityUSD
    brokerbotDayData.txCount = brokerbotDayData.txCount.plus(constants.BIGINT_ONE)
    // update volume metrics
    brokerbotDayData.volumeBase = brokerbotDayData.volumeBase.plus(swap.amountBase)
    brokerbotDayData.volumeToken = brokerbotDayData.volumeToken.plus(swap.amountToken)
    brokerbotDayData.volumeUSD = brokerbotDayData.volumeUSD.plus(swap.amountUSD)
    brokerbotDayData.volumeXCHF = brokerbotDayData.volumeXCHF.plus(swap.amountXCHF)
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
    brokerbotHourData.priceUSD = brokerbot.priceUSD
    brokerbotHourData.priceXCHF = brokerbot.priceXCHF
    brokerbotHourData.totalValueLockedUSD = brokerbot.totalValueLockedUSD
    brokerbotHourData.totalValueLockedXCHF = brokerbot.totalValueLockedXCHF
    brokerbotHourData.liquidityXCHF = brokerbot.liquidityXCHF
    brokerbotHourData.liquidityUSD = brokerbot.liquidityUSD
    brokerbotHourData.txCount = brokerbotHourData.txCount.plus(constants.BIGINT_ONE)
    // update volume metrics  
    brokerbotHourData.volumeBase = brokerbotHourData.volumeBase.plus(swap.amountBase)
    brokerbotHourData.volumeToken = brokerbotHourData.volumeToken.plus(swap.amountToken)
    brokerbotHourData.volumeUSD = brokerbotHourData.volumeUSD.plus(swap.amountUSD)
    brokerbotHourData.volumeXCHF = brokerbotHourData.volumeXCHF.plus(swap.amountXCHF)
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
  let tokenPrice = token.derivedXCHF
  let tokenWeekData = TokenWeekData.load(tokenDayID)
  if (tokenWeekData === null) {
    tokenWeekData = new TokenWeekData(tokenDayID)
    tokenWeekData.date = dayStartTimestamp
    tokenWeekData.token = token.id
    tokenWeekData.volume = constants.BIGDECIMAL_ZERO
    tokenWeekData.volumeUSD = constants.BIGDECIMAL_ZERO
    tokenWeekData.volumeXCHF = constants.BIGDECIMAL_ZERO
    tokenWeekData.open = tokenPrice
    tokenWeekData.high = tokenPrice
    tokenWeekData.low = tokenPrice
    tokenWeekData.close = tokenPrice
  }

  if (tokenPrice.gt(tokenWeekData.high)) {
    tokenWeekData.high = tokenPrice
  }

  if (tokenPrice.lt(tokenWeekData.low)) {
    tokenWeekData.low = tokenPrice
  }

  tokenWeekData.close = tokenPrice
  tokenWeekData.priceUSD = token.derivedUSD
  tokenWeekData.priceXCHF = token.derivedXCHF
  tokenWeekData.totalValueLocked = token.totalValueLocked
  tokenWeekData.totalValueLockedUSD = token.totalValueLockedUSD
  tokenWeekData.totalValueLockedXCHF = token.totalValueLockedXCHF
  // update volmue metrics
  tokenWeekData.volume = tokenWeekData.volume.plus(swap.amountToken)
  tokenWeekData.volumeUSD = tokenWeekData.volumeUSD.plus(swap.amountUSD)
  tokenWeekData.volumeXCHF = tokenWeekData.volumeXCHF.plus(swap.amountXCHF)
  // liqudity metrics
  tokenWeekData.liquidityXCHF = token.liquidityXCHF
  tokenWeekData.liquidityUSD = token.liquidityUSD
  // raised metrics
  if (swap.isBuy) {
    tokenWeekData.raisedXCHF = tokenWeekData.raisedXCHF.plus(swap.amountXCHF)
    tokenWeekData.raisedUSD = tokenWeekData.raisedUSD.plus(swap.amountUSD)
  } else {
    tokenWeekData.raisedXCHF = tokenWeekData.raisedXCHF.minus(swap.amountXCHF)
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

  tokenDayData.close = tokenPrice
  tokenDayData.priceUSD = token.derivedUSD
  tokenDayData.priceXCHF = token.derivedXCHF
  tokenDayData.totalValueLocked = token.totalValueLocked
  tokenDayData.totalValueLockedUSD = token.totalValueLockedUSD
  tokenDayData.totalValueLockedXCHF = token.totalValueLockedXCHF
  // update volume metrics  
  tokenDayData.volume = tokenDayData.volume.plus(swap.amountBase)
  tokenDayData.volumeUSD = tokenDayData.volumeUSD.plus(swap.amountUSD)
  tokenDayData.volumeXCHF = tokenDayData.volumeXCHF.plus(swap.amountXCHF)
  // liqudity metrics
  tokenDayData.liquidityXCHF = token.liquidityXCHF
  tokenDayData.liquidityUSD = token.liquidityUSD
  // raised metrics
  if (swap.isBuy) {
    tokenDayData.raisedXCHF = tokenDayData.raisedXCHF.plus(swap.amountXCHF)
    tokenDayData.raisedUSD = tokenDayData.raisedUSD.plus(swap.amountUSD)
  } else {
    tokenDayData.raisedXCHF = tokenDayData.raisedXCHF.minus(swap.amountXCHF)
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

  tokenHourData.close = tokenPrice
  tokenHourData.priceUSD = token.derivedUSD
  tokenHourData.priceXCHF = token.derivedXCHF
  tokenHourData.totalValueLocked = token.totalValueLocked
  tokenHourData.totalValueLockedUSD = token.totalValueLockedUSD
  tokenHourData.totalValueLockedXCHF = token.totalValueLockedXCHF
  // update volume metrics
  tokenHourData.volume = tokenHourData.volume.plus(swap.amountToken)
  tokenHourData.volumeUSD = tokenHourData.volumeUSD.plus(swap.amountUSD)
  tokenHourData.volumeXCHF = tokenHourData.volumeXCHF.plus(swap.amountXCHF)
  // liqudity metrics
  tokenHourData.liquidityXCHF = token.liquidityXCHF
  tokenHourData.liquidityUSD = token.liquidityUSD
  // raised metrics
  if (swap.isBuy) {
    tokenHourData.raisedXCHF = tokenHourData.raisedXCHF.plus(swap.amountXCHF)
    tokenHourData.raisedUSD = tokenHourData.raisedUSD.plus(swap.amountUSD)
  } else {
    tokenHourData.raisedXCHF = tokenHourData.raisedXCHF.minus(swap.amountXCHF)
    tokenHourData.raisedUSD = tokenHourData.raisedUSD.minus(swap.amountUSD)
  }
  tokenHourData.save()

  return tokenHourData as TokenHourData
}