import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BondMarket } from './bondMarket.entity';
import { LiquidityPoolFarm } from './liquidityPoolFarm.entity';

@Entity('bond_quote_token', { schema: 'public' })
export class BondQuoteToken {
    @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
      id: number;

    @Column('text', { name: 'chain', nullable: true })
      chain: string | null;

    @Column('text', { name: 'symbol', nullable: true })
      symbol: string | null;

    @Column('integer', { name: 'decimals', nullable: true })
      decimals: number;

    @Column('text', { name: 'address', nullable: true })
      address: string | null;

    @Column('text', { name: 'token_symbol1', nullable: true })
      tokenSymbol1: string | null;

    @Column('text', { name: 'token_address1', nullable: true })
      tokenAddress1: string | null;

    @Column('integer', { name: 'token_decimals1', nullable: true })
      tokenDecimals1: number;

    @Column('text', { name: 'token_symbol2', nullable: true })
      tokenSymbol2: string | null;

    @Column('text', { name: 'token_address2', nullable: true })
      tokenAddress2: string | null;

    @Column('integer', { name: 'token_decimals2', nullable: true })
      tokenDecimals2: number;

    @Column('text', { name: 'image_url', nullable: true })
      imageUrl: string | null;

    @Column('text', { name: 'description', nullable: true })
      description: string | null;

    @Column('text', { name: 'purchase_url', nullable: true })
      purchaseUrl: string | null;

    @Column('integer', { name: 'sort_order', nullable: true })
      sortOrder: number | null;

    @Column('integer', { name: 'status', nullable: true })
      status: number | null;

    @OneToMany(() => BondMarket, stk => stk.quoteToken)
      markets: BondMarket[];

    @Column('numeric', { name: 'usd_price', nullable: true })
      usdPrice: number | null;

    @OneToMany(() => LiquidityPoolFarm, stk => stk.stakeToken)
      farms: LiquidityPoolFarm[];
}
