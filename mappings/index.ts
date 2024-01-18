/* eslint-disable prefer-const */
import {Address, BigDecimal, BigInt} from "@graphprotocol/graph-ts";
import {ListedNFT} from "../generated/B2NFTMarketplace/B2NFTMarketplace";
import {AskOrder, Collection, NFT, User} from "../generated/schema";
import {fetchTokenURI} from "./utils/erc721";
import {toBigDecimal} from "./utils";


// Constants
let ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// BigNumber-like references
let ZERO_BI = BigInt.fromI32(0);
let ONE_BI = BigInt.fromI32(1);
let ZERO_BD = BigDecimal.fromString("0");

export function handleListedNFT(event: ListedNFT): void {
    let user = User.load(event.params.seller.toHex());
    if (user === null) {
        user = new User(event.params.seller.toHex());
        user.numberTokensListed = ONE_BI;
        user.numberTokensPurchased = ZERO_BI;
        user.numberTokensSold = ZERO_BI;
        user.totalVolumeInBNBTokensPurchased = ZERO_BD;
        user.totalVolumeInBNBTokensSold = ZERO_BD;
        user.totalFeesCollectedInBNB = ZERO_BD;
        user.averageTokenPriceInBNBPurchased = ZERO_BD;
        user.averageTokenPriceInBNBSold = ZERO_BD;
        user.save();
    }
    user.numberTokensListed = user.numberTokensListed.plus(ONE_BI);
    user.save();

    let collection = Collection.load(event.params.nft.toHex());
    if (collection) {
        collection.numberTokensListed = collection.numberTokensListed.plus(ONE_BI);
        collection.save();

        let token = NFT.load(event.params.nft.toHex() + "-" + event.params.tokenId.toString());
        if (token === null) {
            token = new NFT(event.params.nft.toHex() + "-" + event.params.tokenId.toString());
            token.tokenId = event.params.tokenId;
            token.collection = collection.id;
            token.metadataUrl = fetchTokenURI(event.params.nft, event.params.tokenId);
            token.updatedAt = event.block.timestamp;
            token.currentAskPrice = toBigDecimal(event.params.price, 18);
            token.currentSeller = event.params.seller.toHex();
            token.latestTradedPriceInBNB = ZERO_BD;
            token.tradeVolumeBNB = ZERO_BD;
            token.totalTrades = ZERO_BI;
            token.isTradable = true;
            token.save();
        }
        token.updatedAt = event.block.timestamp;
        token.currentAskPrice = toBigDecimal(event.params.price, 18);
        token.currentSeller = event.params.seller.toHex();
        token.isTradable = true;
        token.save();

        let order = new AskOrder(event.transaction.hash.toHex());
        order.block = event.block.number;
        order.timestamp = event.block.timestamp;
        order.collection = collection.id;
        order.nft = token.id;
        order.orderType = "New";
        order.askPrice = toBigDecimal(event.params.price, 18);
        order.seller = user.id;
        order.save();
    }
}
