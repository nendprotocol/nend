import { BigNumber } from "ethers";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Account } from "./account.entity";
import { Asset } from "./asset.entity";

@Entity("asset_loan_offer", {schema: "public"})
export class AssetLoanOffer {
    
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: number;

  @Column("bigint", { name: "lender_id", nullable: true })
  lenderId: number | null;

  @Column("bigint", { name: "borrower_id", nullable: true })
  borrowerId: number | null;
  
  @Column("text", { name: "borrower_address", nullable: true })
  borrowerAddress: string | null;

  @Column("text", { name: "lender_address", nullable: true })
  lenderAddress: string | null;

  @Column("text", { name: "lender_sig", nullable: true })
  lenderSig: string | null;

  @Column("text", { name: "lender_nonce", nullable: true })
  lenderNonce: string | null;

  @Column("text", { name: "chain", nullable: true })
  chain: string | null;
  
  @Column("text", { name: "token_address", nullable: true })
  tokenAddress: string | null;
  
  @Column("text", { name: "token_id", nullable: true })
  tokenId: string | null;
  
  @Column("text", { name: "payment_token", nullable: true })
  paymentToken: string | null;
  
  @Column("text", { name: "payment_token_address", nullable: true })
  paymentTokenAddress: string | null;

  @Column("text", { name: "loan_amount", nullable: true })
  loanAmount: string | null;

  @Column("decimal", { precision: 40, name: "loan_amount_ordinal", nullable: true })
  loanAmountOrdinal: BigNumber | null;

  @Column("text", { name: "leveraged_amount", nullable: true })
  leveragedAmount: string | null;
  
  @Column("decimal", { precision: 40, name: "leveraged_amount_ordinal", nullable: true })
  leveragedAmountOrdinal: BigNumber | null;

  @Column("integer", { name: "leveraged_pct", nullable: true })
  leveragedPct: number | null;

  @Column("text", { name: "repayment_amount", nullable: true })
  repaymentAmount: string | null;

  @Column("decimal", { precision: 40, name: "repayment_amount_ordinal", nullable: true })
  repaymentAmountOrdinal: BigNumber | null;
  
  @Column("integer", { name: "duration", nullable: true })
  duration: number | null;
  
  @Column("integer", { name: "commission_basis_points", nullable: true })
  commissionBasisPoints: number | null;

  @Column("integer", { name: "apr", nullable: true })
  apr: number | null;  

  @Column("boolean", { name: "liquidate_via_auction", nullable: true })
  liquidateViaAuction: boolean | null;

  @Column("integer", { name: "status", nullable: true })
  status: number | null;

  @Column("timestamp without time zone", { name: "created_date", nullable: true })
  createdDate: Date | null;

  @Column("timestamp without time zone", { name: "modified_date", nullable: true })
  modifiedDate: Date | null;
  
  @ManyToOne(() => Asset, (x) => x.loanOffers, {onDelete:'SET NULL'})
  @JoinColumn([
    { name: "chain", referencedColumnName: "chain" },
    { name: "token_address", referencedColumnName: "tokenAddress" },
    { name: "token_id", referencedColumnName: "tokenId" },
  ])
  asset: Asset;

  @ManyToOne(() => Account, (account) => account.lenderLoanOffers, {onDelete:'SET NULL'})
  @JoinColumn([{ name: "lender_id", referencedColumnName: "id" }])
  lender: Account;

  @ManyToOne(() => Account, (account) => account.borrowerLoanOffers, {onDelete:'SET NULL'})
  @JoinColumn([{ name: "borrower_id", referencedColumnName: "id" }])
  borrower: Account;  


}