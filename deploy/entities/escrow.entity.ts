import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from "typeorm";
import { Account } from "./account.entity";
import { Asset } from "./asset.entity";
import { Stake } from "./stake.entity";

@Entity("escrow", { schema: "public" })
export class Escrow {
  @PrimaryColumn({ type: "text" })
  id: string;

  @PrimaryColumn("text")
  chain: string;

  @Column("text", { name: "token_address" })
  tokenAddress: string;

  @Column("text", { name: "owner_address" })
  ownerAddress: string;

  @Column("bigint", { name: "owner_id" })
  ownerId: number;

  @Column("text", { name: "parent_stake_id" })
  parentStakeId: string | null;

  @Column("text", { name: "child_stake_id" })
  childStakeId: string | null;

  @Column("text", { name: "eab_token_id", nullable: true })
  eabTokenId: string | null;

  @Column("text")
  amount: string;

  @Column("timestamp without time zone", { name: "escrowed_at" })
  escrowedAt: Date;

  @Column("timestamp without time zone", { name: "claim_after" })
  claimAfter: Date;

  @Column("boolean")
  claimed: boolean;

  @Column("boolean", { default: false })
  cancelled: boolean;

  @Column("boolean", { name: "eab_issued" })
  eabIssued: boolean;

  @Column("text", { name: "tx_id", nullable: true })
  txId: string;

  // @ManyToOne(() => Account, (account) => account.escrows)
  // @JoinColumn([{ name: "owner_id", referencedColumnName: "id" }])
  // owner: Account;

  // @ManyToOne(() => Stake, (stake) => stake.escrows)
  // @JoinColumn([
  //   { name: "parent_stake_id", referencedColumnName: "id" },
  //   { name: "chain", referencedColumnName: "chain" }
  // ])
  // parentStake: Stake;

  // @OneToOne(() => Stake, (stake) => stake.boundEscrow)
  // @JoinColumn([
  //   { name: "child_stake_id", referencedColumnName: "id" },
  //   { name: "chain", referencedColumnName: "chain" }
  // ])
  // childStake: Stake;

  // @OneToOne(() => Asset, (x) => x.stake)
  // @JoinColumn([
  //   { name: "chain", referencedColumnName: "chain" },
  //   { name: "token_address", referencedColumnName: "tokenAddress" },
  //   { name: "eab_token_id", referencedColumnName: "tokenId" },
  // ])
  // eab: Asset | null;
}