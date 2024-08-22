import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { Bond } from "./bond.entity";
import { BondQuoteToken } from "./bondQuoteToken.entity";

@Entity("bond_market", { schema: "public" })
export class BondMarket {
  @PrimaryColumn("text")
  id: string;

  @PrimaryColumn("text")
  chain: string;

  @Column("timestamp without time zone")
  conclusion: Date;

  @Column("boolean", { name: "capacity_in_quote" })
  capacityInQuote: boolean;

  @Column("boolean")
  closed: boolean;

  @Column("text", { name: "bond_price", nullable: true })
  bondPrice: string | null;

  @Column("text", { name: "max_bond_amount", nullable: true })
  maxBondAmount: string | null;

  @Column("numeric", { name: "market_price", nullable: true })
  marketPrice: number | null;

  @Column("text", { nullable: true })
  capacity: string | null;

  @Column("bigint", { name: "quote_token_id" })
  quoteTokenId: number;

  @JoinColumn({ name: "quote_token_id", referencedColumnName: "id" })
  @ManyToOne(() => BondQuoteToken, c => c.markets)
  quoteToken: BondQuoteToken;

  @OneToMany(() => Bond, b => b.market)
  bonds: Bond[];
}