import { bool } from "aws-sdk/clients/signer";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { BondQuoteToken } from "./bondQuoteToken.entity";
import { LiquidityPoolStake } from "./liquidityPoolStake.entity";
import { StakeToken } from "./stakeToken.entity";

@Entity("liquidity_pool_farm", { schema: "public" })
export class LiquidityPoolFarm {
  @PrimaryColumn("text")
  id: string;

  @PrimaryColumn("text")
  chain: string;

  @Column("bigint", { name: "stake_token_id" })
  stakeTokenId: number;

  @ManyToOne(() => BondQuoteToken, c => c.farms)
  @JoinColumn({ name: "stake_token_id", referencedColumnName: "id" })
  stakeToken: BondQuoteToken;

  @Column("timestamp without time zone")
  start: Date;

  @Column("timestamp without time zone")
  end: Date;

  // Closed on chain
  @Column("boolean")
  closed: bool;

  @Column("text", { name: "total_reward" })
  totalReward: string;
  
  @OneToMany(() => LiquidityPoolStake, b => b.farm)
  stakes: LiquidityPoolStake[];
}