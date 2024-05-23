import { Address } from "@graphprotocol/graph-ts"
import {
  OwnershipTransferred,
  RegisterBrokerbot,
  SyncBrokerbot
} from "../generated/BrokerbotRegistry/BrokerbotRegistry"
import {   
  Brokerbot,
  Token,
} from "../generated/schema"
import {
  fetchTokenBalance,
  convertTokenToDecimal,
  convertToUsd,
  getRegistry,
  getEntities,
  fetchBrokerbotBasePrice,
  ZERO_BD,
  ONE_BD,
} from './utils/helpers'

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  const REGISTRY_ADDRESS = event.address.toHexString()
  const registry = getRegistry(REGISTRY_ADDRESS)
  registry.owner = event.params.newOwner.toHexString()
  registry.save()
}

export function handleRegisterBrokerbot(event: RegisterBrokerbot): void {
  const entities = getEntities(event)
  // save entities  
  entities.registry.save()
  entities.brokerbot.save()
  entities.base.save()
  entities.token.save()
  
}


export function handleSyncBrokerbot(event: SyncBrokerbot): void {
  let registry = getRegistry(event.address.toHexString())
  let brokerbot = Brokerbot.load(event.params.brokerbot.toHexString())
  // only sync if brokerbot exists
  if (brokerbot !== null) {
    let base = Token.load(brokerbot.base)
    let token = Token.load(brokerbot.token)
    if (base !== null && token !== null) {
      // get current market balance
      const marketBaseBalance  = convertTokenToDecimal(fetchTokenBalance(Address.fromString(base.id), Address.fromString(brokerbot.id)), base.decimals)
      const marketTokenBalance = convertTokenToDecimal(fetchTokenBalance(Address.fromString(token.id), Address.fromString(brokerbot.id)), token.decimals)

      // reset total liquidity amounts
      base.totalValueLocked = base.totalValueLocked.minus(brokerbot.reserveBase)
      token.totalValueLocked = token.totalValueLocked.minus(brokerbot.reserveToken)
      registry.totalValueLockedCHF = registry.totalValueLockedCHF.minus(brokerbot.totalValueLockedCHF)

      // update stats
      base.totalValueLocked = base.totalValueLocked.plus(marketBaseBalance)
      base.totalValueLockedUSD = convertToUsd(base.id, base.totalValueLocked)

      token.totalValueLocked = token.totalValueLocked.plus(marketTokenBalance)
      token.totalValueLockedUSD = convertToUsd(base.id, token.totalValueLocked.times(brokerbot.basePrice))

      brokerbot.reserveBase = marketBaseBalance
      brokerbot.reserveToken = marketTokenBalance
      brokerbot.basePrice = convertTokenToDecimal(fetchBrokerbotBasePrice(Address.fromString(brokerbot.id)), base.decimals)
      if (brokerbot.basePrice.gt(ZERO_BD)) {
        brokerbot.tokenPrice = ONE_BD.div(brokerbot.basePrice)
      }
      brokerbot.totalValueLockedCHF = marketBaseBalance.plus(marketTokenBalance.times(brokerbot.basePrice))
      brokerbot.totalValueLockedUSD = convertToUsd(base.id, brokerbot.totalValueLockedCHF)

      registry.totalValueLockedCHF = registry.totalValueLockedCHF.plus(brokerbot.totalValueLockedCHF)
      registry.totalValueLockedUSD = convertToUsd(base.id, registry.totalValueLockedCHF)

      // save entities
      registry.save()
      brokerbot.save()
      base.save()
      token.save()
    }
  }

}
