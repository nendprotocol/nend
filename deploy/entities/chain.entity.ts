import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("chain", { schema: "public" })
export class Chain {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: number;

  @Column("bigint", { name: "chain_id", nullable: true })
  chainId: number | null;

  @Column("integer", { name: "chain_type", nullable: true })
  chainType: number | null;

  @Column("text", { name: "name", nullable: true })
  name: string | null;

  @Column("text", { name: "code", nullable: true })
  code: string | null;

  @Column("text", { name: "image_url", nullable: true })
  imageUrl: string | null;

  @Column("boolean", { name: "is_mainnet", nullable: true })
  isMainnet: boolean | null;

  @Column("integer", { name: "last_sync_block_number", nullable: true })
  lastSyncBlockNum: number;

  @Column("text", { name: "explorer_url", nullable: true })
  explorerUrl: string;

  @Column("text", { name: "node_url", nullable: true })
  nodeUrl: string | null;

  @Column("text", { name: "nend_address", nullable: true })
  nendAddress: string;

  @Column("text", { name: "vpc1_address", nullable: true })
  vpc1Address: string;

  @Column("text", { name: "vpc2_address", nullable: true })
  vpc2Address: string;

  @Column("text", { name: "vpc3_address", nullable: true })
  vpc3Address: string;

  @Column("text", { name: "vpc4_address", nullable: true })
  vpc4Address: string;

  @Column("text", { name: "vpc_bridge_address", nullable: true })
  vpcBridgeAddress: string;

  @Column("text", { name: "lending_pool_staking_address", nullable: true })
  lendingPoolStakingAddress: string;

  @Column("text", { name: "liquidity_pool_staking_address", nullable: true })
  liquidityPoolStakingAddress: string;

  @Column("text", { name: "bonding_address", nullable: true })
  bondingAddress: string;

  @Column("text", { name: "collection_factory_address", nullable: true })
  collectionFactoryAddress: string;

  @Column("text", { name: "marketplace_address", nullable: true })
  marketplaceAddress: string;

  @Column("text", { name: "curation_address", nullable: true })
  curationAddress: string;

  @Column("text", { name: "loan_address", nullable: true })
  loanAddress: string;

  @Column("text", { name: "auction_address", nullable: true })
  auctionAddress: string;

  @Column("text", { name: "trust_deed_address", nullable: true })
  trustDeedAddress: string;

  @Column("text", { name: "admin_address", nullable: true })
  adminAddress: string;

  @Column("text", { name: "master_wallet_address", nullable: true })
  masterWalletAddress: string;

  @Column("text", { name: "tnt_wallet_address", nullable: true })
  tntWalletAddress: string;

  @Column("text", { name: "commission_pool_address", nullable: true })
  commissionPoolAddress: string;

  @Column("text", { name: "lending_pool_address", nullable: true })
  lendingPoolAddress: string;

  @Column("text", { name: "curation_reward_address", nullable: true })
  curationRewardAddress: string;

  @Column("text", { name: "insurance_vault_address", nullable: true })
  insuranceVaultAddress: string;

  @Column("text", { name: "ecosystem_fund_address", nullable: true })
  ecosystemFundAddress: string;

  @Column("integer", { name: "sort_order", nullable: true })
  sortOrder: number | null;

  @Column("integer", { name: "status", nullable: true })
  status: number | null;

  @Column("jsonb", {
    name: "ifp_in_basis_point",
    nullable: true,
    default: ["4000", "4500", "5000", "5000", "5500", "6000", "7000", "8000", "9000"],
  })
  ifpInBasisPoint: object;
}
