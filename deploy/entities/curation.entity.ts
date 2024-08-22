import { CurationStatus } from '../models/enums';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Asset } from './asset.entity';
import { Vote } from './vote.entity';
import { PaymentToken } from './paymentToken.entity';
import { Account } from './account.entity';

@Entity('curation', { schema: 'public' })
export class Curation {
  @PrimaryColumn({ type: 'text', name: 'hash' })
  hash: string;

  @Column('text', { name: 'chain' })
  chain: string;

  @Column('text', { name: 'token_address' })
  tokenAddress: string;

  @Column('text', { name: 'token_id' })
  tokenId: string;

  @Column('timestamp without time zone')
  start: Date;

  @Column('timestamp without time zone')
  end: Date;

  @Column('text', { name: 'owner_address' })
  ownerAddress: string;

  @Column('bigint', { name: 'payment_token_id' })
  paymentTokenId: number;

  @Column('integer', { name: 'status', default: CurationStatus.ONGOING })
  status: number;

  @Column('boolean')
  ended: boolean;

  @Column('integer', { name: 'winning_option', nullable: true })
  winningOption: number;

  @Column('timestamp without time zone', {
    name: 'last_winning_option_requested',
    nullable: true,
  })
  lastWinningOptionRequested: Date | null;

  @Column('simple-array', { name: 'amount_options' })
  amountOptions: string[];

  @Column('simple-json', { name: 'duration_options' })
  durationOptions: number[];

  @Column('simple-json', { name: 'apr_options' })
  aprOptions: number[];

  @Column('numeric', { name: 'settled_loan_amount_usd', nullable: true })
  settledLoanAmountUsd: number | null;

  @ManyToOne(
    () => Asset,
    a => a.curations,
    { onDelete: 'SET NULL' },
  )
  @JoinColumn([
    { name: 'chain', referencedColumnName: 'chain' },
    { name: 'token_address', referencedColumnName: 'tokenAddress' },
    { name: 'token_id', referencedColumnName: 'tokenId' },
  ])
  asset: Asset;

  @ManyToOne(
    () => Account,
    account => account.curations,
    { onDelete: 'SET NULL' },
  )
  @JoinColumn([{ name: 'owner_id', referencedColumnName: 'id' }])
  owner: Account;

  @ManyToOne(
    () => PaymentToken,
    a => a.curations,
    { onDelete: 'SET NULL' },
  )
  @JoinColumn([{ name: 'payment_token_id', referencedColumnName: 'id' }])
  paymentToken: PaymentToken;

  @OneToMany(
    () => Vote,
    v => v.curation,
  )
  votes: Vote[];
}
