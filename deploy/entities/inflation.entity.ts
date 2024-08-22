import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("inflation", { schema: "public" })
export class Inflation {
  @PrimaryColumn("integer")
  count: number;

  @PrimaryColumn("text")
  chain: string;

  @Column("text")
  amount: string;

  @Column("text")
  signature: string;

  @Column("boolean")
  processed: boolean;
}
