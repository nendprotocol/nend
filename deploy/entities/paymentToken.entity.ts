import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Asset } from "./asset.entity";
import { Curation } from "./curation.entity";

@Entity("payment_token", { schema: "public" })
export class PaymentToken {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: number;

  @Column("text", { name: "chain", nullable: true })
  chain: string | null;

  @Column("text", { name: "name", nullable: true })
  name: string | null;

  @Column("text", { name: "symbol", nullable: true })
  symbol: string | null;

  @Column("text", { name: "cmc_symbol", nullable: true })
  cmcSymbol: string | null;

  @Column("integer", { name: "decimals", nullable: true })
  decimals: number | null;

  @Column("text", { name: "address", nullable: true })
  address: string | null;

  @Column("text", { name: "image_url", nullable: true })
  imageUrl: string | null;

  @Column("numeric", { name: "eth_price", nullable: true })
  ethPrice: number | null;

  @Column("numeric", { name: "usd_price", nullable: true })
  usdPrice: number | null;

  @Column("integer", { name: "sort_order", nullable: true })
  sortOrder: number | null;

  // Assets with loans using this token
  @OneToMany(() => Asset, asset => asset.paymentToken)
  assets: Asset[];

  @OneToMany(() => Curation, curation => curation.paymentToken)
  curations: Curation[];
}
