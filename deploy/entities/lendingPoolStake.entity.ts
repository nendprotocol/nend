import { EscrowStatus, StakeStatus } from "../models/enums";
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
} from "typeorm";
import { Account } from "./account.entity";
import { Asset } from "./asset.entity";
import { StakeToken } from "./stakeToken.entity";

@Entity("lending_pool_stake", { schema: "public" })
export class LendingPoolStake {
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

  @Column("bigint", { name: "history_stake_token_id", nullable: true })
  historyStakeTokenId: number | null;

  @Column("bigint", { name: "staker_id" })
  stakerId: number;

  @Column("text")
  amount: string;

  @Column("jsonb", { name: "amounts_per_duration", nullable: true })
  amountsPerDuration: object | null;

  @Column("timestamp without time zone")
  start: Date;

  @Column("timestamp without time zone")
  end: Date;

  @Column("text", { name: "reward_allocated" })
  rewardAllocated: string;

  @Column("integer", {
    name: "stake_status",
  })
  stakeStatus: number;

  @Column("integer", {
    name: "escrow_status",
  })
  escrowStatus: number;

  @Column("boolean", { name: "is_escrow" })
  isEscrow: boolean;

  @Column("text", { name: "eab_token_id", nullable: true })
  eabTokenId: string | null;

  @JoinColumn({ name: "stake_token_id", referencedColumnName: "id" })
  @ManyToOne(() => StakeToken, (c) => c.lendingPoolStakes)
  stakeToken: StakeToken;

  @ManyToOne(() => Account, (account) => account.lendingPoolStakeHistory)
  @JoinColumn([{ name: "staker_id", referencedColumnName: "id" }])
  staker: Account;

  @OneToOne(() => Asset, (x) => x.stake)
  @JoinColumn([
    { name: "chain", referencedColumnName: "chain" },
    { name: "token_address", referencedColumnName: "tokenAddress" },
    { name: "eab_token_id", referencedColumnName: "tokenId" },
  ])
  eab: Asset | null;
}
