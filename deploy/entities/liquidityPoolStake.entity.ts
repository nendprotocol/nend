import { EscrowStatus, StakeStatus } from "../models/enums";
import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryColumn } from "typeorm";
import { Account } from "./account.entity";
import { Asset } from "./asset.entity";
import { LiquidityPoolFarm } from "./liquidityPoolFarm.entity";
import { StakeToken } from "./stakeToken.entity";

@Entity("liquidity_pool_stake", { schema: "public" })
export class LiquidityPoolStake {
  @PrimaryColumn("text")
  id: string;

  @PrimaryColumn("text")
  chain: string;

  @Column("text", { name: "staker_address" })
  stakerAddress: string;

  @Column("bigint", { name: "staker_id" })
  stakerId: number;

  @Column("text")
  amount: string;

  @Column("text", { name: "reward_claimed" })
  rewardClaimed: string;

  @Column("timestamp without time zone", { name: "last_claimed_at" })
  lastClaimedAt: Date;

  @Column("timestamp without time zone")
  start: Date;

  @Column("timestamp without time zone", { nullable: true, default: null })
  end: Date | null;

  @Column("text", { name: "farm_id" })
  farmId: string;

  @ManyToOne(() => LiquidityPoolFarm, (farm) => farm.stakes)
  @JoinColumn([{ name: "farm_id", referencedColumnName: "id" }])
  @JoinColumn([{ name: "chain", referencedColumnName: "chain" }])
  farm: LiquidityPoolFarm;
  
  @ManyToOne(() => Account, (account) => account.liquidityPoolStakeHistory)
  @JoinColumn([{ name: "staker_id", referencedColumnName: "id" }])
  staker: Account;
}