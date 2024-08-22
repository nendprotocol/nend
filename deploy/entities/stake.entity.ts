import { EscrowStatus, StakeStatus } from "../models/enums";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryColumn } from "typeorm";
import { Account } from "./account.entity";
import { Asset } from "./asset.entity";
import { StakeToken } from "./stakeToken.entity";

@Entity("stake", { schema: "public" })
export class Stake {
  @PrimaryColumn("text")
  id: string;

  @PrimaryColumn("text")
  chain: string;

  @PrimaryColumn("text", { name: "token_address" })
  tokenAddress: string;

  @Column("text", { name: "staker_address" })
  stakerAddress: string;

  @Column("bigint", { name: "stake_token_id" })
  stakeTokenId: number;

  @Column("bigint", { name: "staker_id" })
  stakerId: number;

  @Column("text")
  amount: string;

  @Column("timestamp without time zone")
  start: Date;

  @Column("timestamp without time zone")
  end: Date;

  @Column("text", { name: "reward_allocated" })
  rewardAllocated: string;

  @Column("integer", { name: "reward_allocation_id" })
  rewardAllocationId: number;

  @Column("enum", {
    name: "stake_status",
    enum: StakeStatus,
    default: StakeStatus.DEFAULT
  })
  stakeStatus: StakeStatus;

  @Column("enum", {
    name: "escrow_status",
    enum: EscrowStatus,
    default: EscrowStatus.DEFAULT
  })
  escrowStatus: EscrowStatus;

  @Column("text", { name: "parent_id", nullable: true })
  parentId: string | null;

  @Column("text", { name: "eab_token_id", nullable: true })
  eabTokenId: string | null;

  // @JoinColumn({ name: "stake_token_id", referencedColumnName: "id" })
  // @ManyToOne(() => StakeToken, c => c.lendingPoolStakes)
  // stakeToken: StakeToken;

  // @ManyToOne(() => Account, (account) => account.stakeHistory)
  // @JoinColumn([{ name: "staker_id", referencedColumnName: "id" }])
  // staker: Account;

  // @OneToMany(() => Stake, (x) => x.parentStake)
  // childStakes: Stake[];

  // @ManyToOne(() => Stake, (stake) => stake.childStakes, { onDelete: "CASCADE" })
  // @JoinColumn([
  //     { name: "parent_id", referencedColumnName: "id" },
  //     { name: "token_address", referencedColumnName: "tokenAddress" },
  //     { name: "chain", referencedColumnName: "chain" }
  //   ])
  // parentStake: Stake;

  // @OneToOne(() => Asset, (x) => x.stake)
  // @JoinColumn([
  //   { name: "chain", referencedColumnName: "chain" },
  //   { name: "token_address", referencedColumnName: "tokenAddress" },
  //   { name: "eab_token_id", referencedColumnName: "tokenId" },
  // ])
  // eab: Asset | null;
}