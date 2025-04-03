import './config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Chain } from './entities/chain.entity';
import { PaymentToken } from './entities/paymentToken.entity';
import { Stake } from './entities/stake.entity';
import { Vpc } from './entities/vpc.entity';
import { Account } from './entities/account.entity';
import { StakeToken } from './entities/stakeToken.entity';
import { Escrow } from './entities/escrow.entity';
import { Asset } from './entities/asset.entity';
import { AssetLoanTerms } from './entities/assetLoanTerms.entity';
import { MarketplaceOrder } from './entities/marketplaceOrder.entity';
import { Loan } from './entities/loan.entity';
import { OrderOffer } from './entities/orderOffer.entity';
import { OrderConsideration } from './entities/orderConsideration.entity';
import { Curation } from './entities/curation.entity';
import { Vote } from './entities/vote.entity';
import { AssetLoanOffer } from './entities/assetLoanOffer.entity';
import { NendBridgeRequest } from './entities/nendBridgeRequest.entity';
import { UserActivityLog } from './entities/userActivityLog.entity';
import { UserLoginLog } from './entities/userLoginLog.entity';
import { MysteryBox } from './entities/mysteryBox.entity';
import { Bond } from './entities/bond.entity';
import { BondMarket } from './entities/bondMarket.entity';
import { BondQuoteToken } from './entities/bondQuoteToken.entity';
import { Collection } from './entities/collection.entity';
import { VPCBridgeRequest } from './entities/vpcBridgeRequest.entity';
import { LendingPoolStake } from './entities/lendingPoolStake.entity';
import { LiquidityPoolFarm } from './entities/liquidityPoolFarm.entity';
import { LiquidityPoolStake } from './entities/liquidityPoolStake.entity';
import { VaultProxy } from './entities/vaultProxy.entity';
import { Settings } from './entities/settings.entity';
import { Inflation } from './entities/inflation.entity';
import { CurationIflReward } from './entities/curationIflReward.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize: false,
  logging: false,
  entities: [Chain, PaymentToken, Stake, Vpc, StakeToken, Account, Escrow, Asset, AssetLoanTerms, MarketplaceOrder, Loan, OrderOffer, OrderConsideration, Curation, Vote, AssetLoanOffer, NendBridgeRequest, UserActivityLog, UserLoginLog, MysteryBox, Bond, BondMarket, BondQuoteToken, Collection, VPCBridgeRequest, LendingPoolStake, LiquidityPoolFarm, LiquidityPoolStake, VaultProxy, Settings, Inflation, CurationIflReward],
  // entities: [ __dirname + '/entities/*.entity{.ts,.js}', ],
  migrations: [],
  subscribers: []
});

if (AppDataSource.isInitialized === false) {
  AppDataSource.initialize()
    .then(async () => {
      console.log('Connection initialized with database...');
    })
    .catch((error) => console.log(error));
}

export const getDataSource = (delay = 3000): Promise<DataSource> => {
  if (AppDataSource.isInitialized) return Promise.resolve(AppDataSource);

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (AppDataSource.isInitialized) resolve(AppDataSource);
      else reject(new Error('Failed to create connection with database'));
    }, delay);
  });
};
