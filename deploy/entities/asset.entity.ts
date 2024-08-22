import { Account } from './account.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { BigNumber } from 'ethers';
import { Collection } from './collection.entity';
import { AssetTrait, KeyValuePair } from '../models/models';
import { MarketplaceOrder } from './marketplaceOrder.entity';
import { Curation } from './curation.entity';
import { PaymentToken } from './paymentToken.entity';
import { AssetLoanOffer } from './assetLoanOffer.entity';
import { Loan } from './loan.entity';
import { LendingPoolStake } from './lendingPoolStake.entity';
import { CollectionStatus } from '../models/enums';

@Entity('asset', { schema: 'public' })
@Index(["status", "type", "collectionStatus"])
@Index(["status", "type", "collectionStatus", "chain"])
@Index(["status", "type", "collectionStatus", "tokenAddress"])
@Index(["status", "type", "collectionStatus", "chain", "tokenAddress"])
export class Asset {
  @PrimaryColumn('text', { name: 'chain' })
  chain: string | null;

  @PrimaryColumn('text', { name: 'token_address' })
  tokenAddress: string | null;

  @PrimaryColumn('text', { name: 'token_id' })
  tokenId: string | null;

  @Column('bigint', { name: 'owner_id', nullable: true })
  ownerId: number | null;

  @Column('integer', { name: 'type', nullable: true })
  type: number | null;

  @Column("integer", { name: "collection_status", nullable: false, default: CollectionStatus.Unverified })
  collectionStatus: number;

  // opensea
  @Column('integer', { name: 'num_sales', nullable: true })
  numSales: number | null;

  @Column('text', { name: 'asset_url', nullable: true })
  assetUrl: string | null;

  @Column('text', { name: 'asset_original_url', nullable: true })
  assetOriginalUrl: string | null;

  @Column('text', { name: 'thumbnail_url', nullable: true })
  thumbnailUrl: string | null;

  @Column('text', { name: 'name', nullable: true })
  name: string | null;

  @Column('text', { name: 'description', nullable: true })
  description: string | null;

  @Column('text', { name: 'external_link', nullable: true })
  externalLink: string | null;

  @Column('jsonb', { name: 'traits', nullable: true })
  traits: AssetTrait[] | null;

  @Column('jsonb', { name: 'details', nullable: true })
  details: KeyValuePair[] | null;

  @Index()
  @Column('timestamp without time zone', { name: 'last_sale', nullable: true })
  lastSale: Date | null;

  @Column('text', { name: 'contract_type', nullable: true })
  contractType: string | null;

  @Column('timestamp without time zone', { name: 'synced_at', nullable: true })
  syncedAt: Date | null;

  // custom
  @Column('text', { name: 'price', nullable: true })
  price: string | null;

  @Column('decimal', { precision: 40, name: 'price_ordinal', nullable: true })
  priceOrdinal: BigNumber | null;

  @Column('text', { name: 'end_price', nullable: true })
  endPrice: string | null;

  @Column('decimal', {
    precision: 40,
    name: 'end_price_ordinal',
    nullable: true,
  })
  endPriceOrdinal: BigNumber | null;

  @Column('text', { name: 'price_token', nullable: true })
  priceToken: string;

  @Column('text', { name: 'last_sold_price', nullable: true })
  lastSoldPrice: string | null;

  @Column('decimal', {
    precision: 40,
    name: 'last_sold_price_ordinal',
    nullable: true,
  })
  lastSoldPriceOrdinal: BigNumber | null;

  @Column('text', { name: 'last_sold_token', nullable: true })
  lastSoldToken: string;

  @Index()
  @Column('numeric', { name: 'last_sold_price_usd', nullable: true })
  lastSoldPriceUsd: number | null;

  @Column('timestamp without time zone', { name: 'start_time', nullable: true })
  startTime: Date | null;

  @Column('timestamp without time zone', { name: 'end_time', nullable: true })
  endTime: Date | null;

  @Column('text', { name: 'owner_address', nullable: true })
  ownerAddress: string | null;

  @Column('text', { name: 'creator_address', nullable: true })
  creatorAddress: string | null;

  @Column('integer', { name: 'status', nullable: true })
  status: number | null;

  @Index()
  @Column('timestamp without time zone', {
    name: 'listed_date',
    nullable: true,
  })
  listDate: Date | null;

  @Column('integer', { name: 'loan_payment_token_id', nullable: true })
  loanPaymentTokenId: number;

  @Index()
  @Column('timestamp without time zone', {
    name: 'created_date',
    nullable: true,
  })
  createdDate: Date | null;

  @Column('text', { name: 'desired_loan_amount', nullable: true })
  desiredLoanAmount: string;

  @Column('integer', { name: 'desired_loan_duration', nullable: true })
  desiredLoanDuration: number;

  @Column('decimal', { name: 'desired_loan_apr', nullable: true })
  desiredLoanAPR: number;

  @Column('boolean', { name: 'desired_leverage_lending', nullable: true })
  desiredLeverageLending: boolean;

  @Column('text', { name: 'curated_loan_amount', nullable: true })
  curatedLoanAmount: string;

  @Column('integer', { name: 'curated_loan_duration', nullable: true })
  curatedLoanDuration: number;

  @Column('decimal', { name: 'curated_loan_apr', nullable: true })
  curatedLoanAPR: number;

  @Column('boolean', { name: 'curated_leverage_lending', nullable: true })
  curatedLeverageLending: boolean;

  @Column('text', { name: 'last_curation_hash', nullable: true })
  lastCurationHash: string | null;

  @Column('numeric', { name: 'estimated_price_eth_nftbank', nullable: true })
  estimatedPriceEthNftBank: number;

  @Column('numeric', { name: 'estimated_price_usd_nftbank', nullable: true })
  estimatedPriceUsdNftBank: number;

  @Column('timestamp without time zone', {
    name: 'last_update_nftbank',
    nullable: true,
  })
  lastUpdateNftBank: Date | null;

  @Column('numeric', { name: 'last_traded_price_moralis', nullable: true })
  lastTradedPriceMoralis: number;

  @Column('numeric', { name: 'last_traded_price_usd_moralis', nullable: true })
  lastTradedPriceUsdMoralis: number;

  @Column('timestamp without time zone', {
    name: 'last_update_moralis',
    nullable: true,
  })
  lastUpdateMoralis: Date | null;

  @Column('boolean', { name: 'vpc_revealed', default: false })
  vpcRevealed: boolean;

  @Column('integer', { name: 'vpc_level', nullable: true })
  vpcLevel: number;

  @Column('text', { name: 'price_history', nullable: true })
  priceHistory: string | null;

  @Column('text', { name: 'stake_id', nullable: true })
  stakeId: string | null;

  @Column('timestamp without time zone', {
    name: 'last_curation',
    nullable: true,
  })
  lastCuration: Date | null;

  @OneToMany(() => MarketplaceOrder, (x) => x.asset)
  orders: MarketplaceOrder[];

  @OneToMany(() => Curation, (c) => c.asset)
  curations: Curation[];

  @OneToMany(() => AssetLoanOffer, (c) => c.asset)
  loanOffers: AssetLoanOffer[];

  @OneToMany(() => Loan, (x) => x.asset)
  loans: Loan[];

  @OneToMany(() => Loan, (x) => x.promissoryNote)
  promissoryNotes: Loan[];

  @OneToMany(() => Loan, (x) => x.trustDeed)
  trustDeeds: Loan[];

  @OneToOne(() => LendingPoolStake, (x) => x.eab, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'chain', referencedColumnName: 'chain' },
    { name: 'token_address', referencedColumnName: 'tokenAddress' },
    { name: 'stake_id', referencedColumnName: 'id' },
  ])
  stake: LendingPoolStake;

  @ManyToOne(() => PaymentToken, (p) => p.assets, { onDelete: 'SET NULL' })
  @JoinColumn([{ name: 'loan_payment_token_id', referencedColumnName: 'id' }])
  paymentToken: PaymentToken;

  @ManyToOne(() => Collection, (collection) => collection.assets, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([
    { name: 'chain', referencedColumnName: 'chain' },
    { name: 'token_address', referencedColumnName: 'tokenAddress' },
  ])
  collection: Collection;

  @ManyToOne(() => Account, (account) => account.assets, {
    onDelete: 'SET NULL',
  })
  @JoinColumn([{ name: 'owner_id', referencedColumnName: 'id' }])
  owner: Account;
}
