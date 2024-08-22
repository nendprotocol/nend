import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Asset } from './asset.entity';
import { MarketplaceOrder } from './marketplaceOrder.entity';
import { NendBridgeRequest } from './nendBridgeRequest.entity';
import { UserActivityLog } from './userActivityLog.entity';
import { Curation } from './curation.entity';
import { Loan } from './loan.entity';
import { AssetLoanOffer } from './assetLoanOffer.entity';
import { UserLoginLog } from './userLoginLog.entity';
import { Vote } from './vote.entity';
import { MysteryBox } from './mysteryBox.entity';
import { Bond } from './bond.entity';
import { VPCBridgeRequest } from './vpcBridgeRequest.entity';
import { LendingPoolStake } from './lendingPoolStake.entity';
import { LiquidityPoolStake } from './liquidityPoolStake.entity';
import { CurationIflReward } from './curationIflReward.entity';

@Entity("account", { schema: "public" })
export class Account {

  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: number;

  @Column("text", { name: "user_name", nullable: true })
  userName: string | null;

  @Column("text", { name: "profile_img_url", nullable: true })
  profileImgUrl: string | null;

  @Column("text", { name: "chain", nullable: true })
  chain: string;

  @Column("text", { name: "address", unique: true })
  address: string;

  @Column("text", { name: "email", nullable: true })
  email: string | null;

  @Column("character varying", {
    name: "current_hashed_refresh_token",
    nullable: true,
  })
  currentHashedRefreshToken: string | null;

  @Column("integer", { name: "type", nullable: true })
  type: number | null;

  @Column("text", { name: "nonce", nullable: true })
  nonce: string | null;

  @Column("integer", { name: "status", nullable: true })
  status: number | null;

  @Column("bigint", { name: "last_sync", default: 0 })
  lastSync: number;

  @Column("boolean", { name: "sync", nullable: true })
  sync: boolean;

  @Column("timestamp without time zone", { name: "notification_read_date", nullable: true })
  notificationReadDate: Date | null;

  @Column("jsonb", { name: "details", nullable: true })
  details: object | null;

  @Column("timestamp without time zone", { name: "created_date", nullable: true })
  createdDate: Date | null;

  @OneToMany(() => Asset, (asset) => asset.owner)
  assets: Asset[];

  @OneToMany(() => MarketplaceOrder, (x) => x.offerer)
  orders: MarketplaceOrder[];

  @OneToMany(() => Curation, (x) => x.owner)
  curations: Curation[];

  @OneToMany(() => Vote, (x) => x.voter)
  votes: Vote[];

  @OneToMany(() => Loan, (x) => x.lender)
  lenderLoans: Loan[];

  @OneToMany(() => Loan, (x) => x.borrower)
  borrowerLoans: Loan[];

  @OneToMany(() => AssetLoanOffer, (x) => x.lender)
  lenderLoanOffers: AssetLoanOffer[];

  @OneToMany(() => AssetLoanOffer, (x) => x.borrower)
  borrowerLoanOffers: AssetLoanOffer[];

  @OneToMany(() => NendBridgeRequest, (x) => x.sender)
  nendBridgeRequests: NendBridgeRequest[];

  @OneToMany(() => VPCBridgeRequest, (x) => x.sender)
  vpcBridgeRequests: VPCBridgeRequest[];

  @OneToMany(() => CurationIflReward, (x) => x.recipient)
  curationIflRewards: CurationIflReward[];

  @OneToMany(() => UserActivityLog, (x) => x.user)
  userActivityLogs: UserActivityLog[];

  @OneToMany(() => UserLoginLog, (x) => x.user)
  userLoginLogs: UserLoginLog[];

  @OneToMany(() => MysteryBox, (x) => x.owner)
  mysteryBoxes: MysteryBox[];

  @OneToMany(() => LendingPoolStake, (x) => x.staker)
  lendingPoolStakeHistory: LendingPoolStake[];

  @OneToMany(() => LiquidityPoolStake, (x) => x.staker)
  liquidityPoolStakeHistory: LiquidityPoolStake[];

  @OneToMany(() => Bond, (x) => x.owner)
  bondHistory: Bond[];
}
