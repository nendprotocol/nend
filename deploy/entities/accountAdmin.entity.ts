import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity("account_admin", { schema: "public" })
export class AccountAdmin {

  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: number;

  @Column("text", { name: "user_name", nullable: true })
  userName: string | null;

  @Column("text", { name: "address", unique: true })
  address: string;

  @Column("text", { name: "password", unique: true })
  password: string;

  @Column("character varying", {
    name: "current_hashed_refresh_token",
    nullable: true,
  })
  currentHashedRefreshToken: string | null;

  @Column("text", { name: "nonce", nullable: true })
  nonce: string | null;

  @Column("integer", { name: "status", nullable: true })
  status: number | null;

  @Column("timestamp without time zone", { name: "created_date", nullable: true })
  createdDate: Date | null;

}
