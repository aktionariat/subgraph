import { Address, TypedMap } from "@graphprotocol/graph-ts";

export const NETWORK_STRING = "matic";

///////////////////////////////////////////////////////////////////////////
////////////////////// BROKERBOT REGISTRY CONTRACT ////////////////////////
///////////////////////////////////////////////////////////////////////////

export const BROKERBOT_REGISTRY_CONTRACT_ADDRESSES = Address.fromString(
  "0x6548fad069f2eda512a658c17606eed81095c93d"
);

///////////////////////////////////////////////////////////////////////////
///////////////////////////// UNISWAP CONTRACT ////////////////////////////
///////////////////////////////////////////////////////////////////////////

export const UNISWAP_QUOTER_CONTRACT_ADDRESSES = Address.fromString(
  "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6"
);

///////////////////////////////////////////////////////////////////////////
///////////////////////////// CHAINLINK CONTRACT //////////////////////////
///////////////////////////////////////////////////////////////////////////

export const CHAIN_LINK_CONTRACT_ADDRESS = Address.fromString(
  "0x0000000000000000000000000000000000000000"
);

///////////////////////////////////////////////////////////////////////////
///////////////////////////////// HELPERS /////////////////////////////////
///////////////////////////////////////////////////////////////////////////

export const WHITELIST_TOKENS = new TypedMap<string, Address>();
WHITELIST_TOKENS.set(
  "WETH",
  Address.fromString("0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619")
);
WHITELIST_TOKENS.set(
  "ETH",
  Address.fromString("0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619")
);
WHITELIST_TOKENS.set(
  "USDT",
  Address.fromString("0xc2132D05D31c914a87C6611C10748AEb04B58e8F")
);
WHITELIST_TOKENS.set(
  "DAI",
  Address.fromString("0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063")
);
WHITELIST_TOKENS.set(
  "USDC",
  Address.fromString("0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359")
);
WHITELIST_TOKENS.set(
  "WBTC",
  Address.fromString("0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6")
);
WHITELIST_TOKENS.set(
  "LINK",
  Address.fromString("0xb0897686c545045aFc77CF20eC7A532E3120E0F1")
);
WHITELIST_TOKENS.set(
  "XCHF",
  Address.fromString("0x23a72dfa62cd95c08ee116a285ae4f05cbeccd18")
);
WHITELIST_TOKENS.set(
  "ZCHF",
  Address.fromString("0x02567e4b14b25549331fCEe2B56c647A8bAB16FD")
);
