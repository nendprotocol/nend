import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { Account } from "./account.entity";

@Entity("mystery_box", { schema: "public" })
export class MysteryBox {
  @PrimaryColumn("text")
  chain: string;

  @PrimaryColumn("text", { name: "card_id" })
  cardId: string;

  @PrimaryColumn("integer", { name: "card_level" })
  cardLevel: number;

  @Column("boolean", { default: false })
  unboxed: boolean;

  @Column("text", { name: "owner_address" })
  ownerAddress: string;

  @Column("text", { name: "token_address" })
  tokenAddress: string;

  @Column("bigint", { name: "owner_id" })
  ownerId: number;

  @Column("timestamp without time zone", { name: "purchased_date", nullable: true })
  purchasedDate: Date | null;

  @Column("timestamp without time zone", { name: "unboxed_date", nullable: true })
  unboxedDate: Date | null;    

  @ManyToOne(() => Account, (account) => account.mysteryBoxes)
  @JoinColumn([{ name: "owner_id", referencedColumnName: "id" }])
  owner: Account;
}