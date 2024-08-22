import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { BigNumber } from "ethers";
import { Asset } from "./asset.entity";
import { MarketplaceOrder } from "./marketplaceOrder.entity";

@Entity("order_offer", { schema: "public" })
export class OrderOffer {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: number;

  @Column("integer", { name: "offer_type", nullable: true })
  offerType: number | null;

  @Column("integer", { name: "item_type", nullable: true })
  itemType: number | null;

  @Column("text", { name: "chain", nullable: true })
  chain: string | null;

  @Column("text", { name: "token_address", nullable: true })
  tokenAddress: string | null;

  @Column("text", { name: "identifier_or_criteria", nullable: true })
  identifierOrCriteria: string | null;

  @Column("text", { name: "start_amount", nullable: true })
  startAmount: string | null;
  @Column("decimal", { precision: 40, name: "start_amount_ordinal", nullable: true })
  startAmountOrdinal: BigNumber | null;

  @Column("text", { name: "end_amount", nullable: true })
  endAmount: string | null;
  @Column("decimal", { precision: 40, name: "end_amount_ordinal", nullable: true })
  endAmountOrdinal: BigNumber | null;

  @Column("bigint", { name: "order_id", nullable: true })
  orderId: number | null;

  @Column("timestamp without time zone", { name: "created_date", nullable: true })
  createdDate: Date | null;

  @ManyToOne(() => MarketplaceOrder, (x) => x.offers, {onDelete:'CASCADE'})
  @JoinColumn([{ name: "order_id", referencedColumnName: "id" }])
  order: MarketplaceOrder;  

}
