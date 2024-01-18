/* eslint-disable prefer-const */
import { Address, BigInt } from "@graphprotocol/graph-ts";
import {IERC721Metadata} from "../../generated/B2NFTMarketplace/IERC721Metadata";

export function fetchName(collectionAddress: Address): string {
  let contract = IERC721Metadata.bind(collectionAddress);

  let nameResult = contract.try_name();
  if (!nameResult.reverted) {
    return nameResult.value;
  }

  return "unknown";
}

export function fetchSymbol(collectionAddress: Address): string {
  let contract = IERC721Metadata.bind(collectionAddress);

  let symbolResult = contract.try_symbol();
  if (!symbolResult.reverted) {
    return symbolResult.value;
  }

  return "unknown";
}

export function fetchTokenURI(collectionAddress: Address, tokenId: BigInt): string | null {
  let contract = IERC721Metadata.bind(collectionAddress);

  let tokenURIResult = contract.try_tokenURI(tokenId);
  if (!tokenURIResult.reverted) {
    return tokenURIResult.value;
  }

  return null;
}

