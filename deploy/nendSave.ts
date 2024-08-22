import { DataSource, Entity, EntityTarget, ObjectLiteral, QueryResult, Table } from "typeorm";
import { AppDataSource } from "./dataSource"
import version from './version';
import { Chain } from "./entities/chain.entity"
import { PaymentToken } from "./entities/paymentToken.entity"
import { StakeToken } from "./entities/stakeToken.entity"
import { Vpc } from "./entities/vpc.entity"
import { VaultProxy } from "./entities/vaultProxy.entity"
import { Settings } from "./entities/settings.entity"

import { NendBridgeRequest } from "./entities/nendBridgeRequest.entity"
import { VPCBridgeRequest } from "./entities/vpcBridgeRequest.entity"
import { MysteryBox } from "./entities/mysteryBox.entity"
import { LendingPoolStake } from "./entities/lendingPoolStake.entity"
import { LiquidityPoolFarm } from "./entities/liquidityPoolFarm.entity"
import { LiquidityPoolStake } from "./entities/liquidityPoolStake.entity"
import { Bond } from "./entities/bond.entity"
import { BondMarket } from "./entities/bondMarket.entity"
import { Loan } from "./entities/loan.entity"
import { AssetLoanOffer } from "./entities/assetLoanOffer.entity"
import { Inflation } from "./entities/inflation.entity"
import { MarketplaceOrder } from "./entities/marketplaceOrder.entity"
import { Asset } from "./entities/asset.entity"
import { Collection } from "./entities/collection.entity"
import { BondQuoteToken } from "./entities/bondQuoteToken.entity"

import { ContractAddress, ChainNames} from './models/chain'
import vpcLevels from './models/vpcLevels';
import { VaultProxyAddress } from "./models/vaultProxy";
import { CollectionType } from "./models/enums";
import { CollectionStatsModel } from "./models/models";


async function saveToChain (chainCode : string, contractsChain : Record<string, ContractAddress>) {
    const repository = AppDataSource.manager.getRepository(Chain);
    const queryResult : any = await repository.findOne({
        where: {
            code: ChainNames[Number(chainCode)].name
        }
    });

    if (queryResult) {
        for (const [contract] of Object.entries(contractsChain)) {
            // console.log(queryResult[contract]);
            queryResult[contract] = contractsChain[contract].address.toLowerCase();
        }
        // console.log(queryResult);
        await AppDataSource.manager.save(queryResult);
    }
    console.log(`Saved to Chain Table`);
}

async function saveToPaymentToken (chainCode : string, nendAddress : string) {
    const repository = AppDataSource.manager.getRepository(PaymentToken);
    const queryResult : any = await repository.findOne({
        where: {
            chain: ChainNames[Number(chainCode)].name,
            symbol: "NEND"
        }
    });

    if (queryResult) {
        queryResult['address'] = nendAddress.toLowerCase();

        // console.log(queryResult);
        await AppDataSource.manager.save(queryResult);
    }
    console.log(`Saved to Payment Token Table`);
}

async function saveToStakeToken (chainCode : string, nendAddress : string) {
    const repository = AppDataSource.manager.getRepository(StakeToken);
    const queryResult : any = await repository.findOne({
        where: {
            chain: ChainNames[Number(chainCode)].name,
            symbol: "NEND"
        }
    });

    if (queryResult) {
        queryResult['address'] = nendAddress.toLowerCase();

        // console.log(queryResult);
        await AppDataSource.manager.save(queryResult);
    }
    console.log(`Saved to Stake Token Table`);
}

async function saveToVpc (chainCode : string, contractsVpc : Record<string, ContractAddress>) {
    const repository = AppDataSource.manager.getRepository(Vpc);

    let queryResult : any;
    for (const [level] of Object.entries(vpcLevels)) {
        queryResult = await repository.findOne({
            where: {
                chain: ChainNames[Number(chainCode)].name,
                level: Number(level)
            }
        });

        if (queryResult) {
            queryResult['tokenAddress'] = contractsVpc[`vpc${level}Address`].address.toLowerCase();
            queryResult['priceToken'] = contractsVpc[`nendAddress`].address.toLowerCase();

            // console.log(queryResult);
            await AppDataSource.manager.save(queryResult);
        }
    }
    console.log(`Saved to Vpc Table`);
}

async function saveToVaultProxy (chainCode : string, vaultProxies : Record<string, ContractAddress>) {
    const repository = AppDataSource.manager.getRepository(VaultProxy);
    for (const [contract] of Object.entries(vaultProxies)) {
        const queryResult : any = await repository.findOne({
            where: {
                chain: ChainNames[Number(chainCode)].name,
                name: contract
            }
        });

        // console.log(queryResult)
        if (queryResult) {
            queryResult['address'] = vaultProxies[contract].address.toLowerCase();

            // console.log(queryResult);
            await AppDataSource.manager.save(queryResult);
        }
    }
    console.log(`Saved to VaultProxy Table`);
}

async function updateSettings () {
    const repository = AppDataSource.manager.getRepository(Settings);
    const queryResult : any = await repository.findOne({
        where: {
            key: "inflation_state"
        }
    });

    const turbo = version.turbo;

    // console.log(queryResult);
    if (queryResult) {
        if (turbo === true) {
            queryResult['value'] = {"count": 0, "amount": "496865185058440000000000", "interval": 600000, "lastTime": 9999999999999}
        }else{
            queryResult['value'] = {"count": 0, "amount": "496865185058440000000000", "interval": 604800000, "lastTime": 9999999999999}
        }

        // queryResult['count'] = 0;
        // queryResult['amount'] = "496865185058440000000000";
        // queryResult['interval'] = 600000;
        // queryResult['lastTime'] = 9999999999999;

        // console.log(queryResult);
        await AppDataSource.manager.save(queryResult);
    }
    console.log(`Updated Settings Table`);
}

async function insertCollection (chainCode : string, loanAddress : string, trustDeedAddress : string) {
    const repository = AppDataSource.manager.getRepository(Collection);

    const queryResult1 = repository.create({
        chain: ChainNames[Number(chainCode)].name,
        tokenAddress: loanAddress.toLowerCase(),
        contractType: "ERC721",
        name: "PeriFi Loan Promissory Note",
        symbol: "PPN",
        status: 0,
        createdDate: new Date(),
        lastSyncBlockNum: 0,
        createdOnNend: false,
        sync: true,
        isLeverageLendingAvailable: false
    });
    
    // console.log(queryResult);
    await AppDataSource.manager.save(queryResult1);

    const queryResult2 = repository.create({
        chain: ChainNames[Number(chainCode)].name,
        tokenAddress: trustDeedAddress.toLowerCase(),
        contractType: "ERC721",
        name: "PeriFi Loan Trust Deed",
        symbol: "PTD",
        status: 0,
        createdDate: new Date(),
        lastSyncBlockNum: 0,
        createdOnNend: false,
        sync: true,
        isLeverageLendingAvailable: false
    });

    // console.log(queryResult);
    await AppDataSource.manager.save(queryResult2);

    console.log(`Insert to Collection Table`);
}

async function deleteData () {
    const repository1 = AppDataSource.manager.getRepository(NendBridgeRequest);
    await repository1.query(`DELETE FROM nend_bridge_request;`);

    const repository2 = AppDataSource.manager.getRepository(VPCBridgeRequest);
    await repository2.query(`DELETE FROM vpc_bridge_request;`);

    const repository3 = AppDataSource.manager.getRepository(MysteryBox);
    await repository3.query(`DELETE FROM mystery_box;`);

    const repository4 = AppDataSource.manager.getRepository(LendingPoolStake);
    await repository4.query(`DELETE FROM lending_pool_stake;`);

    const repository5 = AppDataSource.manager.getRepository(LiquidityPoolStake);
    await repository5.query(`DELETE FROM liquidity_pool_stake;`);

    const repository6 = AppDataSource.manager.getRepository(LiquidityPoolFarm);
    await repository6.query(`DELETE FROM liquidity_pool_farm;`);

    const repository7 = AppDataSource.manager.getRepository(Bond);
    await repository7.query(`DELETE FROM bond;`);
 
    const repository8 = AppDataSource.manager.getRepository(BondMarket);
    await repository8.query(`DELETE FROM bond_market;`);

    const repository9 = AppDataSource.manager.getRepository(Loan);
    await repository9.query(`DELETE FROM loan;`);

    const repository10 = AppDataSource.manager.getRepository(AssetLoanOffer);
    await repository10.query(`DELETE FROM asset_loan_offer;`);

    const repository11 = AppDataSource.manager.getRepository(Inflation);
    await repository11.query(`DELETE FROM inflation;`);

    const repository12 = AppDataSource.manager.getRepository(MarketplaceOrder);
    await repository12.query(`DELETE FROM marketplace_order where loan_id is not null or auction_id is not null;`);

    const repository13 = AppDataSource.manager.getRepository(Asset);
    await repository13.query(`delete from asset where "type" = 20;`);

    const repository14 = AppDataSource.manager.getRepository(BondQuoteToken);
    await repository14.query(`delete from bond_quote_token;`);

    console.log(`Deleted Data`);
}

async function deleteCollections () {

    const repository1 = AppDataSource.manager.getRepository(Collection);
    const queryResult : any = await repository1.find({
        select: {
            tokenAddress: true
        },
        where: [
            { name: "PeriFi Loan Promissory Note" },
            { name: "PeriFi Loan Trust Deed" }
        ]
    });

    if (queryResult && queryResult.length > 0) {
        const tokens = queryResult.map((a: { tokenAddress: string; }) => `'${a.tokenAddress}'`);

        const repository2 = AppDataSource.manager.getRepository(Asset);

        await repository1.query(`DELETE FROM collection where token_address in (${tokens.toString()});`);
        await repository2.query(`DELETE FROM asset where token_address in (${tokens.toString()});`);
        console.log(`Deleted Collection Data`);
    }

}
// export async function saveToDb (chainCode : string, contracts : Record<string, ContractAddress>, vaultProxies: Record<string, VaultProxyAddress>) {
    // await saveToVaultProxy(chainCode, vaultProxies);
export async function saveToDb (chainCode : string, contracts : Record<string, ContractAddress>) {
    // await getDataSource();
    if(chainCode != "31337") {
        // await deleteData();
        // await updateSettings();
        // await deleteCollections();

        await insertCollection(chainCode, contracts[`loanAddress`].address, contracts[`trustDeedAddress`].address );


        await saveToChain(chainCode, contracts);
        await saveToPaymentToken(chainCode, contracts[`nendAddress`].address);
        await saveToStakeToken(chainCode, contracts[`nendAddress`].address);
        await saveToVpc(chainCode, contracts);
    }
}