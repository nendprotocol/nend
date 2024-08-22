import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('pool_transfer_request', { schema: 'public' })
export class PoolTransferRequest {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: number;

  @Column('timestamp without time zone', {
    name: 'created_at',
  })
  createdAt: Date;

  @Column('boolean', { name: 'burn_processed', default: false })
  burnProcessed: boolean;

  @Column('timestamp without time zone', {
    name: 'burn_processed_at',
    nullable: true,
  })
  burnProcessedAt: Date | null;

  @Column('boolean', { name: 'mint_processed', default: false })
  mintProcessed: boolean;

  @Column('timestamp without time zone', {
    name: 'mint_processed_at',
    nullable: true,
  })
  mintProcessedAt: Date | null;

  @Column('text')
  amount: string;

  @Column('text', { name: 'source_chain', default: false })
  sourceChain: string;

  @Column('text', { name: 'destination_chain', default: false })
  destinationChain: string;

  @Column('integer', { name: 'pool_type' })
  poolType: number;
}
