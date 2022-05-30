import * as constants from "../common/constants";
import { CustomPriceType } from "../common/types";

import { Address, BigInt, Bytes, ethereum,log } from "@graphprotocol/graph-ts";
import { UniswapQuoter as UniswapQuoterContract } from "../../../generated/Brokerbot/UniswapQuoter";
import {
  fetchTokenDecimals
} from '../../helpers'


export function getPriceDai(tokenAddress: Address, network: string): CustomPriceType {
  return getPriceFromQuoterDai(tokenAddress, network);
}

export function getPriceFromQuoterDai(tokenAddress: Address, network: string): CustomPriceType {
  return getPriceFromQuoter(tokenAddress, constants.WHITELIST_TOKENS_MAP.get(network)!.get("DAI")!, network);
}


export function getPriceFromQuoter(token0Address: Address, token1Address: Address, network: string): CustomPriceType {
  let wethAddress = constants.WHITELIST_TOKENS_MAP.get(network)!.get("WETH")!;
  let daiAddress = constants.WHITELIST_TOKENS_MAP.get(network)!.get("DAI")!;

  let path: Address[] = [];
  let encodedPath: Bytes = Bytes.fromI32(0);
  let numberOfJumps: BigInt;
  let inputTokenIsWeth: bool = token0Address == wethAddress || token1Address == wethAddress;
  if(network == 'mainnet') {
    // Path = [xchf, weth, usdc]
    numberOfJumps = BigInt.fromI32(2);

    path.push(token0Address);
    path.push(wethAddress);
    path.push(token1Address);
  } else {
    // Path = [xchf, dai, weth, usdc]
    numberOfJumps = BigInt.fromI32(1);

    path.push(token0Address);
    path.push(token1Address);
    const types = ["address", "uint24", "address"];
    //const values = [token0Address.toHexString(), 500, daiAddress];

    //encodedPath = Bytes.fromHexString(ethers.utils.solidityPack(types,values));
  }

  let token0Decimals = fetchTokenDecimals(token0Address);
  let amountIn = BigInt.fromI32(10).pow(token0Decimals.toI32() as u8);

  let quoterAddress = constants.UNISWAP_QUOTER_CONTRACT_ADDRESSES_MAP.get(network)!;


  let amountOutResult: ethereum.CallResult<BigInt>;
  if (quoterAddress) {
    const uniswapQuoter = UniswapQuoterContract.bind(quoterAddress);
    //amountOutResult = uniswapQuoter.try_quoteExactInput(encodedPath, amountIn);
    amountOutResult = uniswapQuoter.try_quoteExactInputSingle(token0Address, daiAddress, 500, amountIn, constants.BIGINT_ZERO);
    if (amountOutResult.reverted) {
      return new CustomPriceType();
    }

    let amountOut = amountOutResult.value;
    let feeBips = BigInt.fromI32(30); // .3% per swap fees

    let amountOutBigDecimal = amountOut
      .times(constants.BIGINT_TEN_THOUSAND)
      .div(constants.BIGINT_TEN_THOUSAND.minus(feeBips.times(numberOfJumps)))
      .toBigDecimal();

    return CustomPriceType.initialize(amountOutBigDecimal, constants.DEFAULT_DECIMALS.toI32());
  }

  return new CustomPriceType();
}