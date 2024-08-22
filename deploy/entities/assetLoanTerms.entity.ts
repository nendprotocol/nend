import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Asset } from "./asset.entity";

@Entity("asset_loan_terms", { schema: "public" })
export class AssetLoanTerms {
    
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: number;

  @Column("text", { name: "chain", nullable: true })
  chain: string | null;
  
  @Column("text", { name: "token_address", nullable: true })
  tokenAddress: string | null;
  
  @Column("text", { name: "token_id", nullable: true })
  tokenId: string | null;
  
  @Column("text", { name: "payment_token", nullable: true })
  paymentToken: string | null;

  @Column("bigint", { name: "loan_amt", nullable: true })
  loanAmt: number | null;
  
  @Column("bigint", { name: "repayment_amt", nullable: true })
  repaymentAmt: number | null;
  
  @Column("bigint", { name: "duration_in_secs", nullable: true })
  durationInSecs: number | null;
  
  @Column("bigint", { name: "owner_id", nullable: true })
  ownerId: number | null;

  @Column("timestamp without time zone", { name: "created_date", nullable: true })
  createdDate: Date | null;

  @Column("timestamp without time zone", { name: "modified_date", nullable: true })
  modifiedDate: Date | null;
  
  @ManyToOne(() => Asset, (x) => x.orders)
  @JoinColumn([
    { name: "chain", referencedColumnName: "chain" },
    { name: "token_address", referencedColumnName: "tokenAddress" },
    { name: "token_id", referencedColumnName: "tokenId" },
  ])
  asset: Asset;
}