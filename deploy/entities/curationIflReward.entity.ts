import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Account } from './account.entity';

@Entity('curation_ifl_reward', { schema: 'public' })
export class CurationIflReward {
  @PrimaryColumn('text')
  hash: string;

  @PrimaryColumn('text')
  chain: string;

  @Column('text', { name: 'recipient_address' })
  recipientAddress: string;

  @Column({ type: "bigint", name: "recipient_id" })
  recipientId: number;

  @Column('text')
  amount: string;

  @Column('text')
  signature: string;

  @Column('boolean')
  claimed: boolean;

  @ManyToOne(() => Account, (account) => account.vpcBridgeRequests)
  @JoinColumn([{ name: "recipient_id", referencedColumnName: "id" }])
  recipient: Account; 
}
