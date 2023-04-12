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
      pairWeekData.volumeXCHF = constants.BIGDECIMAL_ZERO
      pairWeekData.liquidityUSD = constants.BIGDECIMAL_ZERO
      pairWeekData.liquidityXCHF = constants.BIGDECIMAL_ZERO
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
    pairWeekData.priceXCHF = pair.priceXCHF
    pairWeekData.totalValueLockedUSD = pair.totalValueLockedUSD
    pairWeekData.totalValueLockedXCHF = pair.totalValueLockedXCHF
    pairWeekData.liquidityUSD = pair.liquidityUSD
    pairWeekData.liquidityXCHF = pair.liquidityXCHF
    pairWeekData.txCount = pairWeekData.txCount.plus(constants.BIGINT_ONE)
    // update volume metrics
    pairWeekData.volumeToken1 = pairWeekData.volumeToken1.plus(swap.amountToken1)
    pairWeekData.volumeToken0 = pairWeekData.volumeToken0.plus(swap.amountToken0)
    pairWeekData.volumeUSD = pairWeekData.volumeUSD.plus(swap.amountUSD)
    pairWeekData.volumeXCHF = pairWeekData.volumeXCHF.plus(swap.amountXCHF)
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
      pairDayData.volumeXCHF = constants.BIGDECIMAL_ZERO
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
    pairDayData.priceXCHF = pair.priceXCHF
    pairDayData.totalValueLockedUSD = pair.totalValueLockedUSD
    pairDayData.totalValueLockedXCHF = pair.totalValueLockedXCHF
    pairDayData.liquidityXCHF = pair.liquidityXCHF
    pairDayData.liquidityUSD = pair.liquidityUSD
    pairDayData.txCount = pairDayData.txCount.plus(constants.BIGINT_ONE)
    // update volume metrics
    pairDayData.volumeToken1 = pairDayData.volumeToken1.plus(swap.amountToken1)
    pairDayData.volumeToken0 = pairDayData.volumeToken0.plus(swap.amountToken0)
    pairDayData.volumeUSD = pairDayData.volumeUSD.plus(swap.amountUSD)
    pairDayData.volumeXCHF = pairDayData.volumeXCHF.plus(swap.amountXCHF)
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
      pairHourData.volumeXCHF = constants.BIGDECIMAL_ZERO
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
    pairHourData.priceXCHF = pair.priceXCHF
    pairHourData.totalValueLockedUSD = pair.totalValueLockedUSD
    pairHourData.totalValueLockedXCHF = pair.totalValueLockedXCHF
    pairHourData.liquidityXCHF = pair.liquidityXCHF
    pairHourData.liquidityUSD = pair.liquidityUSD
    pairHourData.txCount = pairHourData.txCount.plus(constants.BIGINT_ONE)
    // update volume metrics  
    pairHourData.volumeToken1 = pairHourData.volumeToken1.plus(swap.amountToken1)
    pairHourData.volumeToken0 = pairHourData.volumeToken0.plus(swap.amountToken0)
    pairHourData.volumeUSD = pairHourData.volumeUSD.plus(swap.amountUSD)
    pairHourData.volumeXCHF = pairHourData.volumeXCHF.plus(swap.amountXCHF)
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
  tokenWeekData.volume = tokenWeekData.volume.plus(swap.amountToken0)
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
  tokenDayData.volume = tokenDayData.volume.plus(swap.amountToken1)
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
  tokenHourData.volume = tokenHourData.volume.plus(swap.amountToken0)
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