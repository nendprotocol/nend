import { BigNumber } from "ethers";
import { Column, Entity, JoinColumn, OneToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Account } from "./account.entity";
import { Asset } from "./asset.entity";
import { MarketplaceOrder } from "./marketplaceOrder.entity";

@Entity("loan", { schema: "public" })
export class Loan {
    
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: number;
  
  @Column("bigint", { name: "contract_id", nullable: true })
  contractId: number | null;
  
  @Column("bigint", { name: "lender_id", nullable: true })
  lenderId: number | null;
  
  @Column("bigint", { name: "borrower_id", nullable: true })
  borrowerId: number | null;

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

  @Column("text", { name: "borrower_address", nullable: true })
  borrowerAddress: string | null;

  @Column("text", { name: "borrower_sig", nullable: true })
  borrowerSig: string | null;
  
  @Column("text", { name: "lender_address", nullable: true })
  lenderAddress: string | null;

  @Column("text", { name: "lender_sig", nullable: true })
  lenderSig: string | null;

  @Column("text", { name: "loan_amount", nullable: true })
  loanAmount: string | null;

  @Column("decimal", { precision: 40, name: "loan_amount_ordinal", nullable: true })
  loanAmountOrdinal: BigNumber | null;

  @Column("numeric", { name: "loan_amount_usd", nullable: true })
  loanAmountUsd: number | null;

  @Column("text", { name: "leveraged_amount", nullable: true })
  leveragedAmount: string | null;
  
  @Column("decimal", { precision: 40, name: "leveraged_amount_ordinal", nullable: true })
  leveragedAmountOrdinal: BigNumber | null;

  @Column("numeric", { name: "leveraged_amount_usd", nullable: true })
  leveragedAmountUsd: number | null;

  @Column("integer", { name: "leveraged_pct", nullable: true })
  leveragedPct: string | null;
    
  @Column("text", { name: "repayment_amount", nullable: true })
  repaymentAmount: string | null;
  
  @Column("decimal", { precision: 40, name: "repayment_amount_ordinal", nullable: true })
  repaymentAmountOrdinal: BigNumber | null;

  @Column("integer", { name: "duration", nullable: true })
  duration: number | null;

  @Column("integer", { name: "apr", nullable: true })
  apr: number | null;  

  @Column("integer", { name: "lender_apr", nullable: true })
  lenderApr: number | null;  

  @Column("text", { name: "borrower_nonce", nullable: true })
  borrowerNonce: string | null;

  @Column("text", { name: "lender_nonce", nullable: true })
  lenderNonce: string | null;

  @Column("boolean", { name: "liquidate_via_auction", nullable: true })
  liquidateViaAuction: boolean | null;

  @Column("integer", { name: "status", nullable: true })
  status: number | null;
  
  @Column("timestamp without time zone", { name: "created_date", nullable: true })
  createdDate: Date | null;

  @Column("timestamp without time zone", { name: "modified_date", nullable: true })
  modifiedDate: Date | null;
      
  @Column("boolean", { name: "trust_deed_issued", nullable: true })
  trustDeedIssued: boolean | null;
  
  @OneToMany(() => MarketplaceOrder, (x) => x.loan)
  auctions: MarketplaceOrder[];

  @Column("text", { name: "promissory_note_chain", nullable: true })
  promissoryNoteChain: string | null;

  @Column("text", { name: "promissory_note_address", nullable: true })
  promissoryNoteAddress: string | null;

  @Column("text", { name: "promissory_note_token_id", nullable: true })
  promissoryNoteTokenId: string | null;
  
  @Column("text", { name: "trust_deed_chain", nullable: true })
  trustDeedChain: string | null;

  @Column("text", { name: "trust_deed_address", nullable: true })
  trustDeedAddress: string | null;

  @Column("text", { name: "trust_deed_token_id", nullable: true })
  trustDeedTokenId: string | null;



  @ManyToOne(() => Asset, (x) => x.loans, {onDelete:'SET NULL'})
  @JoinColumn([
    { name: "chain", referencedColumnName: "chain" },
    { name: "token_address", referencedColumnName: "tokenAddress" },
    { name: "token_id", referencedColumnName: "tokenId" },
  ])
  asset: Asset;

  @ManyToOne(() => Account, (account) => account.lenderLoans, {onDelete:'SET NULL'})
  @JoinColumn([{ name: "lender_id", referencedColumnName: "id" }])
  lender: Account;

  @ManyToOne(() => Account, (account) => account.borrowerLoans, {onDelete:'SET NULL'})
  @JoinColumn([{ name: "borrower_id", referencedColumnName: "id" }])
  borrower: Account;  

  @ManyToOne(() => Asset, (asset) => asset.promissoryNotes, {onDelete:'SET NULL'})
  @JoinColumn([
    { name: "promissoryNoteChain", referencedColumnName: "chain" },
    { name: "promissoryNoteAddress", referencedColumnName: "tokenAddress" },
    { name: "promissoryNoteTokenId", referencedColumnName: "tokenId" },
  ])
  promissoryNote: Asset; 

  @ManyToOne(() => Asset, (asset) => asset.trustDeeds, {onDelete:'SET NULL'})
  @JoinColumn([
    { name: "trustDeedChain", referencedColumnName: "chain" },
    { name: "trustDeedAddress", referencedColumnName: "tokenAddress" },
    { name: "trustDeedTokenId", referencedColumnName: "tokenId" },
  ])
  trustDeed: Asset; 
}