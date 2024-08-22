import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Account } from './account.entity';

@Entity("user_login_log", { schema: "public" })
export class UserLoginLog {

  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: number;

  @Column("bigint", { name: "user_id", nullable: true })
  userId: number | null;

  @Column("text", { name: "user_address", nullable: true })
  userAddress: string | null; 

  @Column("text", { name: "chain", nullable: true })
  chain: string | null; 

  @Column("text", { name: "user_agent", nullable: true })
  userAgent: string | null;

  @Column("text", { name: "ip_address", nullable: true })
  ipAddress: string;

  @Column("timestamp without time zone", { name: "login_date", nullable: true })
  loginDate: Date | null;

  @ManyToOne(() => Account, (account) => account.userLoginLogs)
  @JoinColumn([{ name: "user_id", referencedColumnName: "id" }])
  user: Account;  
}