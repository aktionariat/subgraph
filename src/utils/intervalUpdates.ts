import {
  AktionariatDayData,
  Brokerbot,
  BrokerbotDayData,
  BrokerbotHourData,
  Registry
} from "../../generated/schema"
import { dataSource, ethereum } from '@graphprotocol/graph-ts'
import * as constants from "./common/constants";

/**
 * Tracks global aggregate data over daily windows
 * @param event
 */
export function updateAktionariatDayData(event: ethereum.Event): AktionariatDayData {
  let registry = Registry.load(constants.UNISWAP_QUOTER_CONTRACT_ADDRESSES_MAP.get(dataSource.network())!.toHexString())
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
  aktionariatDayData.tvlUSD = registry!.totalValueLockedUSD
  aktionariatDayData.tvlXCHF = registry!.totalValueLockedXCHF
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
    brokerbotDayData.close = brokerbot.tokenPrice
    brokerbotDayData.tvlUSD = brokerbot.totalValueLockedUSD
    brokerbotDayData.tvlXCHF = brokerbot.totalValueLockedXCHF
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
    brokerbotHourData.tvlUSD = brokerbot.totalValueLockedUSD
    brokerbotHourData.txCount = brokerbotHourData.txCount.plus(constants.BIGINT_ONE)
    brokerbotHourData.save()
  }
    
  // test
  return brokerbotHourData as BrokerbotHourData
}
  