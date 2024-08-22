import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { LendingPoolStake } from "./lendingPoolStake.entity";
import { LiquidityPoolFarm } from "./liquidityPoolFarm.entity";

@Entity("stake_token", { schema: "public" })
export class StakeToken {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: number;

  @Column("text", { name: "chain", nullable: true })
  chain: string | null;

  @Column("text", { name: "symbol", nullable: true })
  symbol: string | null;

  @Column("integer", { name: "decimals", nullable: true })
  decimals: number;

  @Column("text", { name: "address", nullable: true })
  address: string | null;

  @Column("text", { name: "image_url", nullable: true })
  imageUrl: string | null;

  @Column("text", { name: "description", nullable: true })
  description: string | null;

  @Column("integer", { name: "lock_period", nullable: true })
  lockPeriod: number | null;

  @Column("integer", { name: "nend_daily_reward", nullable: true })
  nendDailyReward: number | null;

  @Column("numeric", { name: "usd_price", nullable: true })
  usdPrice: number | null;

  @Column("integer", { name: "sort_order", nullable: true })
  sortOrder: number | null;

  @Column("boolean", { name: "is_eab_allowed", default: false })
  isEabAllowed: boolean;

  @Column("text", { name: "stake_duration", nullable: true })
  stakeDuration: string | null;

  @Column("text", { name: "stake_rewards", nullable: true })
  stakeRewards: string | null;

  @Column("jsonb", {
    name: "last_escrow_reward",
    nullable: true,
    default: ["0", "0", "0"],
  })
  lastEscrowReward: object;

  @OneToMany(() => LendingPoolStake, (stk) => stk.stakeToken)
  lendingPoolStakes: [];

  @Column("text", { name: "lending_pool_balance", default: "0" })
  lendingPoolBalance: string | null;
}
