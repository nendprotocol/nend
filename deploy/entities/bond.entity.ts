import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { Account } from "./account.entity";
import { BondMarket } from "./bondMarket.entity";

@Entity("bond", { schema: "public" })
export class Bond {
  @PrimaryColumn("text")
  id: string;

  @PrimaryColumn("text")
  chain: string;

  @PrimaryColumn("text", { name: "owner_address" })
  ownerAddress: string;

  @Column("text", { name: "market_id" })
  marketId: string;

  @Column("bigint", { name: "owner_id" })
  ownerId: number;

  @Column("text")
  amount: string;

  @Column("text")
  price: string;

  @Column("text")
  payout: string;

  @Column("text", { name: "payout_per_vesting" })
  payoutPerVesting: string;

  @Column("timestamp without time zone")
  created: Date;

  @Column("integer", { name: "vesting_count" })
  vestingCount: number;

  @Column("text", { name: "total_vested" })
  totalVested: string;

  @Column("text", { name: "tx_id", nullable: true })
  txId: string;

  @ManyToOne(() => BondMarket, m => m.bonds)
  @JoinColumn([
    { name: "market_id", referencedColumnName: "id" },
    { name: "chain", referencedColumnName: "chain" }
  ])
  market: BondMarket;

  @ManyToOne(() => Account, (account) => account.bondHistory)
  @JoinColumn([{ name: "owner_id", referencedColumnName: "id" }])
  owner: Account;
}