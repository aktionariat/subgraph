import * as MAINNET from "../config/mainnet";
import * as OPTIMISM from "../config/optimism"
import * as POLYGON from "../config/polygon";

import { Address, BigDecimal, BigInt, TypedMap } from "@graphprotocol/graph-ts";
import { UniswapPair__getReservesResult } from "../../../generated/templates/Brokerbot/UniswapPair";

///////////////////////////////////////////////////////////////////////////
/////////////////////////////////// COMMON ////////////////////////////////
///////////////////////////////////////////////////////////////////////////

export const BIGINT_ZERO = BigInt.fromI32(0);
export const BIGINT_ONE = BigInt.fromI32(1);
export const BIGINT_TEN = BigInt.fromI32(10);
export const BIGINT_TEN_THOUSAND = BigInt.fromI32(10000);

export const BIGDECIMAL_ZERO = new BigDecimal(BIGINT_ZERO);
export const BIGDECIMAL_ONE = new BigDecimal(BIGINT_ONE);

export const DEFAULT_USDC_DECIMALS = 6;
export const DEFAULT_USDT_DECIMALS = BigInt.fromI32(6);
export const DEFAULT_DECIMALS = BigInt.fromI32(18);

export const ZERO_ADDRESS_STRING = "0x0000000000000000000000000000000000000000";

export const ZERO_ADDRESS = Address.fromString(
  "0x0000000000000000000000000000000000000000"
);
export const CHAIN_LINK_USD_ADDRESS = Address.fromString(
  "0x0000000000000000000000000000000000000348"
);

export const WHITELIST_TOKENS_LIST: string[] = [
  "WETH",
  "USDT",
  "DAI",
  "USDC",
  "ETH",
  "WBTC",
  "EURS",
  "LINK",
  "XCHF",
  "ZCHF"
];

///////////////////////////////////////////////////////////////////////////
////////////////////// BROKERBOT REGISTRY CONTRACT ////////////////////////
///////////////////////////////////////////////////////////////////////////

export const BROKERBOT_REGISTRY_CONTRACT_ADDRESSES_MAP = new TypedMap<string, Address>();
BROKERBOT_REGISTRY_CONTRACT_ADDRESSES_MAP.set(
  MAINNET.NETWORK_STRING,
  MAINNET.BROKERBOT_REGISTRY_CONTRACT_ADDRESSES
);
BROKERBOT_REGISTRY_CONTRACT_ADDRESSES_MAP.set(
  OPTIMISM.NETWORK_STRING,
  OPTIMISM.BROKERBOT_REGISTRY_CONTRACT_ADDRESSES
);
BROKERBOT_REGISTRY_CONTRACT_ADDRESSES_MAP.set(
  POLYGON.NETWORK_STRING,
  POLYGON.BROKERBOT_REGISTRY_CONTRACT_ADDRESSES
);

///////////////////////////////////////////////////////////////////////////
///////////////////////////// UNISWAP CONTRACT ////////////////////////////
///////////////////////////////////////////////////////////////////////////

export const UNISWAP_DEFAULT_RESERVE_CALL = new UniswapPair__getReservesResult(
  BIGINT_ZERO,
  BIGINT_ZERO,
  BIGINT_ZERO
);

export const UNISWAP_QUOTER_CONTRACT_ADDRESSES_MAP = new TypedMap<string, Address>();
UNISWAP_QUOTER_CONTRACT_ADDRESSES_MAP.set(
  MAINNET.NETWORK_STRING,
  MAINNET.UNISWAP_QUOTER_CONTRACT_ADDRESSES
);
UNISWAP_QUOTER_CONTRACT_ADDRESSES_MAP.set(
  OPTIMISM.NETWORK_STRING,
  OPTIMISM.UNISWAP_QUOTER_CONTRACT_ADDRESSES
);
UNISWAP_QUOTER_CONTRACT_ADDRESSES_MAP.set(
  POLYGON.NETWORK_STRING,
  POLYGON.UNISWAP_QUOTER_CONTRACT_ADDRESSES
);

///////////////////////////////////////////////////////////////////////////
///////////////////////////// CHAINLINK CONTRACT //////////////////////////
///////////////////////////////////////////////////////////////////////////

export const CHAIN_LINK_CONTRACT_ADDRESS = new Map<string, Address>();
CHAIN_LINK_CONTRACT_ADDRESS.set(
  MAINNET.NETWORK_STRING,
  MAINNET.CHAIN_LINK_CONTRACT_ADDRESS
);

///////////////////////////////////////////////////////////////////////////
///////////////////////////////// HELPERS /////////////////////////////////
///////////////////////////////////////////////////////////////////////////

export const WHITELIST_TOKENS_MAP = new TypedMap<
  string,
  TypedMap<string, Address>
>();
WHITELIST_TOKENS_MAP.set(MAINNET.NETWORK_STRING, MAINNET.WHITELIST_TOKENS);
WHITELIST_TOKENS_MAP.set(OPTIMISM.NETWORK_STRING, OPTIMISM.WHITELIST_TOKENS);
WHITELIST_TOKENS_MAP.set(POLYGON.NETWORK_STRING, POLYGON.WHITELIST_TOKENS);
