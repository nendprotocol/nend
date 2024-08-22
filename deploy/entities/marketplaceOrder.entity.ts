import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { BigNumber } from "ethers";
import { Account } from "./account.entity";
import { Asset } from "./asset.entity";
import { OrderConsideration } from "./orderConsideration.entity";
import { OrderOffer } from "./orderOffer.entity";
import { long } from "aws-sdk/clients/cloudfront";
import { Loan } from "./loan.entity";

@Entity("marketplace_order", { schema: "public" })
export class MarketplaceOrder {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: number;

  @Column("text", { name: "chain", nullable: true })
  chain: string | null;

  @Column("text", { name: "token_address", nullable: true })
  tokenAddress: string | null;

  @Column("text", { name: "token_id", nullable: true })
  tokenId: string | null;

  @Column("text", { name: "payment_token", nullable: true })
  paymentToken: string | null;

  @Column("text", { name: "price", nullable: true })
  price: string | null;
  @Column("decimal", { precision: 40, name: "price_ordinal", nullable: true })
  priceOrdinal: BigNumber | null;

  @Column("text", { name: "end_price", nullable: true })
  endPrice: string | null;
  @Column("decimal", { precision: 40, name: "end_price_ordinal", nullable: true })
  endPriceOrdinal: BigNumber | null;
  
  @Column("text", { name: "sold_price", nullable: true })
  soldPrice: string | null;
  @Column("decimal", { precision: 40, name: "sold_price_ordinal", nullable: true })
  soldPriceOrdinal: BigNumber | null;

  @Column("numeric", { name: "price_usd", nullable: true })
  priceUsd: number | null;

  @Column("numeric", { name: "end_price_usd", nullable: true })
  endPriceUsd: number | null;

  @Column("numeric", { name: "sold_price_usd", nullable: true })
  soldPriceUsd: number | null;

  @Column("text", { name: "offerer_address", nullable: true })
  offererAddress: string | null;

  @Column("bigint", { name: "offerer_id", nullable: true })
  offererId: number | null;

  @Column("text", { name: "recipient_address", nullable: true })
  recipientAddress: string | null;

  @Column("bigint", { name: "recipient_id", nullable: true })
  recipientId: number | null;

  @Column("integer", { name: "listing_type", nullable: true })
  listingType: number | null;

  @Column("integer", { name: "order_type", nullable: true })
  orderType: number | null;

  @Column("text", { name: "salt", nullable: true })
  salt: string | null;

  @Column("text", { name: "nonce", nullable: true })
  nonce: string | null;

  @Column("text", { name: "hash", nullable: true })
  hash: string | null;

  @Column("integer", { name: "status", nullable: true })
  status: number | null;

  @Column("bigint", { name: "start_time", nullable: true })
  startTime: long;

  @Column("bigint", { name: "end_time", nullable: true })
  endTime: long;

  @Column("bigint", { name: "protected_until", nullable: true })
  protectedUntil: long;

  @Column("timestamp without time zone", { name: "created_date", nullable: true })
  createdDate: Date | null;

  @Column("timestamp without time zone", { name: "completed_date", nullable: true })
  completedDate: Date | null;

  @Column("bigint", { name: "loan_id", nullable: true })
  loanId: number | null;

  @Column("bigint", { name: "auction_id", nullable: true })
  auctionId: number | null;

  @Column("text", { name: "latest_liquidation_auction_price", nullable: true })
  latestLiquidationAuctionPrice: string | null;
  
  @ManyToOne(() => Asset, (x) => x.orders, {onDelete:'CASCADE'})
  @JoinColumn([
    { name: "chain", referencedColumnName: "chain" },
    { name: "token_address", referencedColumnName: "tokenAddress" },
    { name: "token_id", referencedColumnName: "tokenId" },
  ])
  asset: Asset;  

  @ManyToOne(() => Account, (account) => account.orders, {onDelete:'SET NULL'})
  @JoinColumn([{ name: "offerer_id", referencedColumnName: "id" }])
  offerer: Account;

  @ManyToOne(() => Loan, (loan) => loan.auctions, {onDelete:'SET NULL'})
  @JoinColumn([{ name: "loan_id", referencedColumnName: "id" }])
  loan: Loan;

  @OneToMany(() => OrderOffer, (x) => x.order)
  offers: OrderOffer[];

  @OneToMany(() => OrderConsideration, (x) => x.order)
  considerations: OrderConsideration[];
}
