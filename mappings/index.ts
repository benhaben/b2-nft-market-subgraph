/* eslint-disable prefer-const */
import {Address, BigDecimal, BigInt} from "@graphprotocol/graph-ts";
import {BoughtNFT, ListedNFT, ModifyListedNFT, UnListedNFT} from "../generated/B2NFTMarketplace/B2NFTMarketplace";
import {AskOrder, Collection, NFT, Transaction, User} from "../generated/schema";
import {fetchName, fetchSymbol, fetchTokenURI} from "./utils/erc721";
import {toBigDecimal} from "./utils";
import {
    CreatedNFTCollection, ModifyNFTCollection,
    ModifyRoyaltyFee
} from "../generated/B2CollectionFactory/B2CollectionFactory";
import {updateCollectionDayData, updateMarketPlaceDayData} from "./utils/dayUpdates";


// Constants
let ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// BigNumber-like references
let ZERO_BI = BigInt.fromI32(0);
let ONE_BI = BigInt.fromI32(1);
let ZERO_BD = BigDecimal.fromString("0");

export function handleCollectionNew(event: CreatedNFTCollection): void {
    let collection = Collection.load(event.params.nft.toHex());
    if (collection === null) {
        collection = new Collection(event.params.nft.toHex());
        collection.name = fetchName(event.params.nft);
        collection.operator = event.params.operator;
        collection.symbol = fetchSymbol(event.params.nft);
        collection.active = true;
        collection.totalTrades = ZERO_BI;
        collection.totalVolumeBNB = ZERO_BD;
        collection.numberTokensListed = ZERO_BI;
        collection.royaltyRecipient = event.params.royaltyRecipient;
        collection.royaltyFees = toBigDecimal(event.params.royaltyFees, 2);
        collection.save();
    }
    collection.active = true;
    collection.operator = event.params.operator;
    collection.royaltyRecipient = event.params.royaltyRecipient;
    collection.royaltyFees = toBigDecimal(event.params.royaltyFees, 2);
    collection.save();
}

export function handleModifyCollection(event: ModifyNFTCollection): void {
    let collection = Collection.load(event.params.nft.toHex());
    if (collection !== null) {
        collection.active = collection.active;
        collection.save();
    }
}

export function handleModifyRoyaltyFee(event: ModifyRoyaltyFee): void {
    let collection = Collection.load(event.params.nft.toHex());
    if (collection !== null) {
        collection.operator = event.params.operator;
        collection.royaltyRecipient = event.params.royaltyRecipient;
        collection.royaltyFees = toBigDecimal(event.params.royaltyFees, 2);
        collection.save();
    }
}

export function handleListedNFT(event: ListedNFT): void {
    let user = User.load(event.params.seller.toHex());
    if (user === null) {
        user = new User(event.params.seller.toHex());
        user.numberTokensListed = ONE_BI;
        user.numberTokensPurchased = ZERO_BI;
        user.numberTokensSold = ZERO_BI;
        user.totalVolumeInBTCTokensPurchased = ZERO_BD;
        user.totalVolumeInBTCTokensSold = ZERO_BD;
        user.totalFeesCollectedInBTC = ZERO_BD;
        user.averageTokenPriceInBTCPurchased = ZERO_BD;
        user.averageTokenPriceInBNBSold = ZERO_BD;
        user.save();
    }
    user.numberTokensListed = user.numberTokensListed.plus(ONE_BI);
    user.save();

    let collection = Collection.load(event.params.nft.toHex());
    if (collection) {
        collection.numberTokensListed = collection.numberTokensListed.plus(ONE_BI);
        collection.save();

        let nft = NFT.load(event.params.nft.toHex() + "-" + event.params.tokenId.toString());
        if (nft === null) {
            nft = new NFT(event.params.nft.toHex() + "-" + event.params.tokenId.toString());
            nft.tokenId = event.params.tokenId;
            nft.collection = collection.id;
            nft.metadataUrl = fetchTokenURI(event.params.nft, event.params.tokenId);
            nft.updatedAt = event.block.timestamp;
            nft.currentAskPrice = toBigDecimal(event.params.price, 18);
            nft.currentSeller = event.params.seller.toHex();
            nft.latestTradedPriceInBNB = ZERO_BD;
            nft.tradeVolumeBTC = ZERO_BD;
            nft.totalTrades = ZERO_BI;
            nft.isTradable = true;
            nft.save();
        }
        nft.updatedAt = event.block.timestamp;
        nft.currentAskPrice = toBigDecimal(event.params.price, 18);
        nft.currentSeller = event.params.seller.toHex();
        nft.isTradable = true;
        nft.save();

        let order = new AskOrder(event.transaction.hash.toHex());
        order.block = event.block.number;
        order.timestamp = event.block.timestamp;
        order.collection = collection.id;
        order.nft = nft.id;
        order.orderType = "New";
        order.askPrice = toBigDecimal(event.params.price, 18);
        order.seller = user.id;
        order.save();
    }
}


export function handleUnListedNFT(event: UnListedNFT): void {
    let user = User.load(event.params.seller.toHex());
    if (user !== null) {
        user.numberTokensListed = user.numberTokensListed.minus(ONE_BI);
        user.save();
    }

    let collection = Collection.load(event.params.nft.toHex());
    if (collection != null) {
        collection.numberTokensListed = collection.numberTokensListed.minus(ONE_BI);
        collection.save();
    }

    let token = NFT.load(event.params.nft.toHex() + "-" + event.params.tokenId.toString());
    if (token !== null) {
        token.currentSeller = ZERO_ADDRESS;
        token.updatedAt = event.block.timestamp;
        token.currentAskPrice = ZERO_BD;
        token.isTradable = false;
        token.save();
    }

    if (token !== null && collection !== null) {
        let order = new AskOrder(event.transaction.hash.toHex());
        order.block = event.block.number;
        order.timestamp = event.block.timestamp;
        order.collection = collection.id;
        order.nft = token.id;
        order.orderType = "Cancel";
        order.askPrice = toBigDecimal(ZERO_BI, 18);
        order.seller = event.params.seller.toHex();
        order.save();
    }
}

export function handleModifyListedNFT(event: ModifyListedNFT): void {
    let token = NFT.load(event.params.nft.toHex() + "-" + event.params.tokenId.toString());
    if (token !== null) {
        token.updatedAt = event.block.timestamp;
        token.currentAskPrice = toBigDecimal(event.params.price, 18);
        token.save();

        let order = new AskOrder(event.transaction.hash.toHex());
        order.block = event.block.number;
        order.timestamp = event.block.timestamp;
        order.collection = token.collection;
        order.nft = token.id;
        order.orderType = "Modify";
        order.askPrice = toBigDecimal(event.params.price, 18);
        order.seller = event.params.seller.toHex();
        order.save();
    }
}

export function handleBoughtNFT(event: BoughtNFT): void {
    // 1. Buyer
    let buyer = User.load(event.params.buyer.toHex());

    // Buyer may not exist
    if (buyer === null) {
        buyer = new User(event.params.buyer.toHex());
        buyer.numberTokensListed = ZERO_BI;
        buyer.numberTokensPurchased = ONE_BI; // 1 token purchased
        buyer.numberTokensSold = ZERO_BI;
        buyer.totalVolumeInBTCTokensPurchased = toBigDecimal(event.params.price, 18);
        buyer.totalVolumeInBTCTokensSold = ZERO_BD;
        buyer.totalFeesCollectedInBTC = ZERO_BD;
        buyer.averageTokenPriceInBTCPurchased = buyer.totalVolumeInBTCTokensPurchased;
        buyer.averageTokenPriceInBNBSold = ZERO_BD;
    } else {
        buyer.numberTokensPurchased = buyer.numberTokensPurchased.plus(ONE_BI);
        buyer.totalVolumeInBTCTokensPurchased = buyer.totalVolumeInBTCTokensPurchased.plus(
            toBigDecimal(event.params.price, 18)
        );

        buyer.averageTokenPriceInBTCPurchased = buyer.totalVolumeInBTCTokensPurchased.div(
            buyer.numberTokensPurchased.toBigDecimal()
        );
    }
    buyer.save();

    // 2. Seller
    let seller = User.load(event.params.seller.toHex());
    if (seller !== null) {
        seller.numberTokensSold = seller.numberTokensSold.plus(ONE_BI);
        seller.numberTokensListed = seller.numberTokensListed.minus(ONE_BI);
        seller.totalVolumeInBTCTokensSold = seller.totalVolumeInBTCTokensSold.plus(toBigDecimal(event.params.netPrice, 18));
        seller.averageTokenPriceInBNBSold = seller.totalVolumeInBTCTokensSold.div(seller.numberTokensSold.toBigDecimal());
        seller.save();
    }

    // 3. Collection
    let collection = Collection.load(event.params.nft.toHex());
    if (collection !== null) {
        collection.totalTrades = collection.totalTrades.plus(ONE_BI);
        collection.totalVolumeBNB = collection.totalVolumeBNB.plus(toBigDecimal(event.params.price, 18));
        collection.numberTokensListed = collection.numberTokensListed.minus(ONE_BI);
        collection.save();
    }

    // 4. NFT
    let tokenConcatId = event.params.nft.toHex() + "-" + event.params.tokenId.toString();
    let nft = NFT.load(tokenConcatId);

    if (nft != null) {
        nft.latestTradedPriceInBNB = toBigDecimal(event.params.price, 18);
        nft.tradeVolumeBTC = nft.tradeVolumeBTC.plus(nft.latestTradedPriceInBNB);
        nft.updatedAt = event.block.timestamp;
        nft.totalTrades = nft.totalTrades.plus(ONE_BI);
        nft.currentAskPrice = ZERO_BD;
        nft.currentSeller = ZERO_ADDRESS;
        nft.isTradable = false;
        nft.save();
    }

    // 5. Transaction
    let transaction = new Transaction(event.transaction.hash.toHex());
    transaction.block = event.block.number;
    transaction.timestamp = event.block.timestamp;
    transaction.collection = event.params.nft.toHex();
    transaction.nft = event.params.nft.toHex() + "-" + event.params.tokenId.toString();
    transaction.askPrice = toBigDecimal(event.params.price, 18);
    transaction.netPrice = toBigDecimal(event.params.netPrice, 18);
    transaction.buyer = event.params.buyer.toHex();
    transaction.seller = event.params.seller.toHex();
    transaction.save();

    updateCollectionDayData(event.params.nft, toBigDecimal(event.params.price, 18), event);
    updateMarketPlaceDayData(toBigDecimal(event.params.price, 18), event);
}