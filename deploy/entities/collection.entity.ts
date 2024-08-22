import { BigNumber } from "ethers";
import { CollectionStatsModel } from "../models/models";
import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Asset } from "./asset.entity";
import { PaymentToken } from "./paymentToken.entity";

@Entity("collection", { schema: "public" })
export class Collection {

  @PrimaryColumn("text", { name: "chain" })
  chain: string | null;

  @PrimaryColumn("text", { name: "token_address" })
  tokenAddress: string | null;

  @Column("text", { name: "slug", nullable: true, unique: true })
  slug: string | null;

  @Column("text", { name: "creator", nullable: true })
  creator: string | null;

  @Column("integer", { name: "type", nullable: true })
  type: number | null;

  @Column("text", { name: "contract_type", nullable: true })
  contractType: string | null;

  @Column("text", { name: "name", nullable: true })
  name: string | null;

  @Column("text", { name: "symbol", nullable: true })
  symbol: string | null;

  @Column("text", { name: "description", nullable: true })
  description: string | null;

  @Column("text", { name: "banner_image_url", nullable: true })
  bannerImageUrl: string | null;

  @Column("text", { name: "image_url", nullable: true })
  imageUrl: string | null;

  @Column("text", { name: "large_image_url", nullable: true })
  largeImageUrl: string | null;

  @Column("text", { name: "external_url", nullable: true })
  externalUrl: string | null;

  @Column("text", { name: "wiki_url", nullable: true })
  wikiUrl: string | null;

  @Column("text", { name: "discord_url", nullable: true })
  discordUrl: string | null;

  @Column("text", { name: "telegram_url", nullable: true })
  telegramUrl: string | null;

  @Column("text", { name: "twitter_username", nullable: true })
  twitterUsername: string | null;

  @Column("text", { name: "instagram_username", nullable: true })
  instagramUsername: string | null;

  @Column("jsonb", { name: "payment_tokens", nullable: true })
  paymentTokens: PaymentToken[] | null;

  @Column("text", { name: "payout_address", nullable: true })
  payoutAddress: string | null;

  @Column("numeric", { name: "opensea_buyer_fee_basis_points", nullable: true })
  openseaBuyerFeeBasisPoints: number | null;

  @Column("numeric", { name: "opensea_seller_fee_basis_points", nullable: true })
  openseaSellerFeeBasisPoints: number | null;

  @Column("numeric", { name: "dev_buyer_fee_basis_points", nullable: true })
  devBuyerFeeBasisPoints: number | null;

  @Column("numeric", { name: "dev_seller_fee_basis_points", nullable: true })
  devSellerFeeBasisPoints: number | null;

  @Column("numeric", { name: "buyer_fee_basis_points", nullable: true })
  buyerFeeBasisPoints: number | null;

  @Column("numeric", { name: "seller_fee_basis_points", nullable: true })
  sellerFeeBasisPoints: number | null;

  @Column("jsonb", { name: "stats", nullable: true })
  stats: CollectionStatsModel | null;

  @Column("integer", { name: "status", nullable: false })
  status: number | null;

  @Column("boolean", { default: false, nullable: true })
  sync: boolean;

  @Column("timestamp without time zone", { name: "created_date", nullable: true })
  createdDate: Date | null;

  @Column("integer", { name: "last_sync_block_number", nullable: true })
  lastSyncBlockNum: number;

  @Column("boolean", { name: "created_on_nend", default: false })
  createdOnNend: boolean;

  @Column("numeric", { name: "floor_price_eth_nftbank", nullable: true })
  floorPriceEthNftBank: number;

  @Column("numeric", { name: "floor_price_usd_nftbank", nullable: true })
  floorPriceUsdNftBank: number;

  @Column("numeric", { name: "floor_price_moralis", nullable: true })
  floorPriceMoralis: number;

  @Column("numeric", { name: "floor_price_usd_moralis", nullable: true })
  floorPriceUsdMoralis: number;

  @Column("timestamp without time zone", { name: "last_update_nftbank", nullable: true })
  lastUpdateNftBank: Date | null;

  @Column("timestamp without time zone", { name: "last_update_moralis", nullable: true })
  lastUpdateMoralis: Date | null;

  @Column("numeric", { name: "pastmonth_average_eth_nftbank", nullable: true })
  pastmonthAverageEthNftBank: number;

  @Column("numeric", { name: "pastmonth_average_usd_nftbank", nullable: true })
  pastmonthAverageUsdNftBank: number;

  @Column("numeric", { name: "pastweek_average_eth_nftbank", nullable: true })
  pastweekAverageEthNftBank: number;

  @Column("numeric", { name: "pastweek_average_usd_nftbank", nullable: true })
  pastweekAverageUsdNftBank: number;

  @Column("numeric", { name: "total_trade_volume_eth_nftbank", nullable: true })
  totalTradeVolumeEthNftBank: number;

  @Column("numeric", { name: "total_trade_volume_usd_nftbank", nullable: true })
  totalTradeVolumeUsdNftBank: number;

  @Column("boolean", { name: "is_leverage_lending_available", default: false })
  isLeverageLendingAvailable: boolean;

  @Column("numeric", { name: "leverage_max_amount_usd", nullable: true })
  leverageMaxAmountUsd: number;

  @Column("text", { name: "floor_price_history", nullable: true })
  floorPriceHistory: string | null;

  @OneToMany(() => Asset, (x) => x.collection)
  assets: Asset[];
}
