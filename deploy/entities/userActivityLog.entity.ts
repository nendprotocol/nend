import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Account } from './account.entity';

@Entity("user_activity_log", { schema: "public" })
export class UserActivityLog {

  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: number;

  @Column("bigint", { name: "user_id", nullable: true })
  userId: number | null;
    
  @Column("text", { name: "chain", nullable: true })
  chain: string | null; 

  @Column("text", { name: "user_address", nullable: true })
  userAddress: string | null; 

  @Column("text", { name: "token_address", nullable: true })
  tokenAddress: string | null; 

  @Column("text", { name: "token_id", nullable: true })
  tokenId: string | null; 

  @Column("integer", { name: "action_type", nullable: true })
  actionType: number | null;

  @Column("text", { name: "desc", nullable: true })
  desc: string | null;

  @Column("jsonb", { name: "details", nullable: true })
  details: object | null;

  @Column("text", { name: "ip_address", nullable: true })
  ipAddress: string;

  @Column("timestamp without time zone", { name: "created_date", nullable: true })
  createdDate: Date | null;

  @ManyToOne(() => Account, (account) => account.userActivityLogs)
  @JoinColumn([{ name: "user_id", referencedColumnName: "id" }])
  user: Account;  
}