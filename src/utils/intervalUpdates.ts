import {
  AktionariatWeekData,
  AktionariatDayData,
  Pair,
  PairDayData,
  PairHourData,
  Registry,
  Token,
  Swap,
  TokenDayData,
  TokenHourData,
  PairWeekData,
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
  aktionariatWeekData.volumeCHF = aktionariatWeekData.volumeCHF.plus(swap.amountXCHF)
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
  aktionariatDayData.volumeCHF = aktionariatDayData.volumeCHF.plus(swap.amountXCHF)
  aktionariatDayData.volumeUSD = aktionariatDayData.volumeUSD.plus(swap.amountUSD)
  aktionariatDayData.save()
  return aktionariatDayData as AktionariatDayData
}

export function updatePairWeekData(event: ethereum.Event, swap:Swap): PairWeekData {
  let timestamp = event.block.timestamp.toI32()
  let weekID = timestamp / 604800
  let dayStartTimestamp = weekID * 604800
  let weekPairID = event.address
    .toHexString()
    .concat('-')
    .concat(weekID.toString())
  let pair = Pair.load(event.address.toHexString())
  let pairWeekData = PairWeekData.load(weekPairID)
  if (pair !== null) {
    if (pairWeekData === null) {
      pairWeekData = new PairWeekData(weekPairID)
      pairWeekData.date = dayStartTimestamp
      pairWeekData.pair = pair.id
      // things that dont get initialized always
      pairWeekData.volumeToken1 = constants.BIGDECIMAL_ZERO
      pairWeekData.volumeToken0 = constants.BIGDECIMAL_ZERO
      pairWeekData.volumeUSD = constants.BIGDECIMAL_ZERO
      pairWeekData.volumeCHF = constants.BIGDECIMAL_ZERO
      pairWeekData.liquidityUSD = constants.BIGDECIMAL_ZERO
      pairWeekData.liquidityCHF = constants.BIGDECIMAL_ZERO
      pairWeekData.txCount = constants.BIGINT_ZERO
      pairWeekData.open = pair.token1Price
      pairWeekData.high = pair.token1Price
      pairWeekData.low = pair.token1Price
      pairWeekData.close = pair.token1Price
    }

    if (pair.token1Price.gt(pairWeekData.high)) {
      pairWeekData.high = pair.token1Price
    }
    if (pair.token1Price.lt(pairWeekData.low)) {
      pairWeekData.low = pair.token1Price
    }

    pairWeekData.token1Price = pair.token1Price
    pairWeekData.token1Price = pair.token1Price
    pairWeekData.close = pair.token1Price
    pairWeekData.priceUSD = pair.priceUSD
    pairWeekData.priceCHF = pair.priceCHF
    pairWeekData.totalValueLockedUSD = pair.totalValueLockedUSD
    pairWeekData.totalValueLockedCHF = pair.totalValueLockedCHF
    pairWeekData.liquidityUSD = pair.liquidityUSD
    pairWeekData.liquidityCHF = pair.liquidityCHF
    pairWeekData.txCount = pairWeekData.txCount.plus(constants.BIGINT_ONE)
    // update volume metrics
    pairWeekData.volumeToken1 = pairWeekData.volumeToken1.plus(swap.amountToken1)
    pairWeekData.volumeToken0 = pairWeekData.volumeToken0.plus(swap.amountToken0)
    pairWeekData.volumeUSD = pairWeekData.volumeUSD.plus(swap.amountUSD)
    pairWeekData.volumeCHF = pairWeekData.volumeCHF.plus(swap.amountXCHF)
    pairWeekData.save()
  }

  return pairWeekData as PairWeekData
}

export function updatePairDayData(event: ethereum.Event, swap:Swap): PairDayData {
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let dayPairID = event.address
    .toHexString()
    .concat('-')
    .concat(dayID.toString())
  let pair = Pair.load(event.address.toHexString())
  let pairDayData = PairDayData.load(dayPairID)
  if (pair !== null) {
    if (pairDayData === null) {
      pairDayData = new PairDayData(dayPairID)
      pairDayData.date = dayStartTimestamp
      pairDayData.pair = pair.id
      // things that dont get initialized always
      pairDayData.volumeToken1 = constants.BIGDECIMAL_ZERO
      pairDayData.volumeToken0 = constants.BIGDECIMAL_ZERO
      pairDayData.volumeUSD = constants.BIGDECIMAL_ZERO
      pairDayData.volumeCHF = constants.BIGDECIMAL_ZERO
      pairDayData.txCount = constants.BIGINT_ZERO
      pairDayData.open = pair.token1Price
      pairDayData.high = pair.token1Price
      pairDayData.low = pair.token1Price
      pairDayData.close = pair.token1Price
    }

    if (pair.token1Price.gt(pairDayData.high)) {
      pairDayData.high = pair.token1Price
    }
    if (pair.token1Price.lt(pairDayData.low)) {
      pairDayData.low = pair.token1Price
    }

    pairDayData.token1Price = pair.token1Price
    pairDayData.token1Price = pair.token1Price
    pairDayData.close = pair.token1Price
    pairDayData.priceUSD = pair.priceUSD
    pairDayData.priceCHF = pair.priceCHF
    pairDayData.totalValueLockedUSD = pair.totalValueLockedUSD
    pairDayData.totalValueLockedCHF = pair.totalValueLockedCHF
    pairDayData.liquidityCHF = pair.liquidityCHF
    pairDayData.liquidityUSD = pair.liquidityUSD
    pairDayData.txCount = pairDayData.txCount.plus(constants.BIGINT_ONE)
    // update volume metrics
    pairDayData.volumeToken1 = pairDayData.volumeToken1.plus(swap.amountToken1)
    pairDayData.volumeToken0 = pairDayData.volumeToken0.plus(swap.amountToken0)
    pairDayData.volumeUSD = pairDayData.volumeUSD.plus(swap.amountUSD)
    pairDayData.volumeCHF = pairDayData.volumeCHF.plus(swap.amountXCHF)
    pairDayData.save()
  }

  return pairDayData as PairDayData
}

export function updatePairHourData(event: ethereum.Event, swap:Swap): PairHourData {
  let timestamp = event.block.timestamp.toI32()
  let hourIndex = timestamp / 3600 // get unique hour within unix history
  let hourStartUnix = hourIndex * 3600 // want the rounded effect
  let hourPoolID = event.address
    .toHexString()
    .concat('-')
    .concat(hourIndex.toString())
  let pair = Pair.load(event.address.toHexString())
  let pairHourData = PairHourData.load(hourPoolID)
  if (pair !== null) {

    if (pairHourData === null) {
      pairHourData = new PairHourData(hourPoolID)
      pairHourData.periodStartUnix = hourStartUnix
      pairHourData.pair = pair.id
      // things that dont get initialized always
      pairHourData.volumeToken1 = constants.BIGDECIMAL_ZERO
      pairHourData.volumeToken0 = constants.BIGDECIMAL_ZERO
      pairHourData.volumeUSD = constants.BIGDECIMAL_ZERO
      pairHourData.volumeCHF = constants.BIGDECIMAL_ZERO
      pairHourData.txCount = constants.BIGINT_ZERO
      pairHourData.open = pair.token1Price
      pairHourData.high = pair.token1Price
      pairHourData.low = pair.token1Price
      pairHourData.close = pair.token1Price
    }
    
    if (pair.token1Price.gt(pairHourData.high)) {
      pairHourData.high = pair.token1Price
    }
    if (pair.token1Price.lt(pairHourData.low)) {
      pairHourData.low = pair.token1Price
    }
    
    pairHourData.token1Price = pair.token1Price
    pairHourData.token1Price = pair.token1Price
    pairHourData.close = pair.token1Price
    pairHourData.priceUSD = pair.priceUSD
    pairHourData.priceCHF = pair.priceCHF
    pairHourData.totalValueLockedUSD = pair.totalValueLockedUSD
    pairHourData.totalValueLockedCHF = pair.totalValueLockedCHF
    pairHourData.liquidityCHF = pair.liquidityCHF
    pairHourData.liquidityUSD = pair.liquidityUSD
    pairHourData.txCount = pairHourData.txCount.plus(constants.BIGINT_ONE)
    // update volume metrics  
    pairHourData.volumeToken1 = pairHourData.volumeToken1.plus(swap.amountToken1)
    pairHourData.volumeToken0 = pairHourData.volumeToken0.plus(swap.amountToken0)
    pairHourData.volumeUSD = pairHourData.volumeUSD.plus(swap.amountUSD)
    pairHourData.volumeCHF = pairHourData.volumeCHF.plus(swap.amountXCHF)
    pairHourData.save()
  }
    
  return pairHourData as PairHourData
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
  tokenWeekData.volume = tokenWeekData.volume.plus(swap.amountToken0)
  tokenWeekData.volumeUSD = tokenWeekData.volumeUSD.plus(swap.amountUSD)
  tokenWeekData.volumeCHF = tokenWeekData.volumeCHF.plus(swap.amountXCHF)
  // liqudity metrics
  tokenWeekData.liquidityCHF = token.liquidityCHF
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
  tokenDayData.volume = tokenDayData.volume.plus(swap.amountToken1)
  tokenDayData.volumeUSD = tokenDayData.volumeUSD.plus(swap.amountUSD)
  tokenDayData.volumeCHF = tokenDayData.volumeCHF.plus(swap.amountXCHF)
  // liqudity metrics
  tokenDayData.liquidityCHF = token.liquidityCHF
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
  tokenHourData.volume = tokenHourData.volume.plus(swap.amountToken0)
  tokenHourData.volumeUSD = tokenHourData.volumeUSD.plus(swap.amountUSD)
  tokenHourData.volumeCHF = tokenHourData.volumeCHF.plus(swap.amountXCHF)
  // liqudity metrics
  tokenHourData.liquidityCHF = token.liquidityCHF
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