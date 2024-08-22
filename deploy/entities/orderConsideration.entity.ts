import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { BigNumber } from "ethers";
import { MarketplaceOrder } from "./marketplaceOrder.entity";

@Entity("order_consideration", { schema: "public" })
export class OrderConsideration {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: number;

  @Column("integer", { name: "item_type", nullable: true })
  itemType: number | null;

  @Column("text", { name: "token", nullable: true })
  token: string | null;

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

  @Column("integer", { name: "status", nullable: true })
  status: number | null;

  @Column("bigint", { name: "order_id", nullable: true })
  orderId: number | null;

  @Column("text", { name: "recipient", nullable: true })
  recipient: string | null;

  @Column("timestamp without time zone", { name: "created_date", nullable: true })
  createdDate: Date | null;  

  @ManyToOne(() => MarketplaceOrder, (x) => x.considerations, {onDelete:'CASCADE'})
  @JoinColumn([{ name: "order_id", referencedColumnName: "id" }])
  order: MarketplaceOrder;

}
