import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("vault_proxy", { schema: "public" })
export class VaultProxy {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: number;

  @Column("text")
  chain: string;

  @Column("text")
  address: string;

  @Column("text")
  name: string;
}