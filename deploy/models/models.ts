// import { ApiProperty } from "@nestjs/swagger";
// import { DistributionConfigurationSummaryList } from "aws-sdk/clients/imagebuilder";
// import { Transform } from 'class-transformer';
import { BondQuoteToken } from '..//entities/bondQuoteToken.entity';
import { StakeToken } from '../entities/stakeToken.entity';
import { VaultProxy } from '..//entities/vaultProxy.entity';
import { Chain } from '../entities/chain.entity';
import { PaymentToken } from '../entities/paymentToken.entity';
import { Vpc } from '../entities/vpc.entity';

export class PagedListModelWithSort<T> {
  items: Array<T>;
  page: number;
  pageSize: number;
  totalItemCount: number;
  sortBy: string;
  sortOrder: string;
}

// export class PagedListModel<T> {
//     @ApiProperty()
//     items: Array<T>;
//     @ApiProperty()
//     page: number;
//     @ApiProperty()
//     pageSize: number;
//     @ApiProperty()
//     totalItemCount: number;
// }

export class KeyValuePair {
  key: string;
  value: string;
}

export class GlobalSettingsModel {
  chains: Chain[];
  paymentTokens: PaymentToken[];
  stakeTokens: StakeToken[];
  bondQuoteTokens: BondQuoteToken[];
  loanDurations: any; // string[];
  vpcs: Vpc[];
  vaultProxies: VaultProxy[];
}

export class CollectionStatsModel {
  one_day_volume: number;
  one_day_change: number;
  one_day_sales: number;
  one_day_average_price: number;
  seven_day_volume: number;
  seven_day_change: number;
  seven_day_sales: number;
  seven_day_average_price: number;
  thirty_day_volume: number;
  thirty_day_change: number;
  thirty_day_sales: number;
  thirty_day_average_price: number;
  total_volume: number;
  total_sales: number;
  total_supply: number;
  count: number;
  num_owners: number;
  average_price: number;
  num_reports: number;
  market_cap: number;
  floor_price: number;
}

export class AssetTrait {
  trait_type: string;
  value: string;
  display_type: string;
  max_value: number | null;
  trait_count: number | null;
  matching_trait_count: number | null;
  order: number | null;
}

export class AssetTraitKV {
  trait_type: string;
  value: string;
}

export class IpfsMetadata {
  name: string;
  description: string;
  type: number;
  attributes: AssetTraitKV[];
  asset: string;
  thumbnail: string;
}

// export class MarketplaceFilters {
//     @ApiProperty()
//     sortOrder: string;
//     @ApiProperty()
//     keywords: string;
//     @ApiProperty()
//     filterStatus: string[];
//     @ApiProperty()
//     filterMinPrice: number;
//     @ApiProperty()
//     filterMaxPrice: number;
//     @ApiProperty()
//     filterContracts: string[]; //collection contract addresses
//     @ApiProperty()
//     filterChains: string[];
// }

// export class Marketplace2Filters {
//     @ApiProperty()
//     sortOrder: string;
//     @ApiProperty()
//     keywords: string;
//     @ApiProperty()
//     filterTypes: number[];
//     // filterStatus: string[];
//     // filterMinPrice: number;
//     // filterMaxPrice: number;
//     // filterContracts: string[]; //collection contract addresses
//     @ApiProperty()
//     filterChains: string[];
// }

// export class CurationFilters {
//     @ApiProperty()
//     status: number;
//     @ApiProperty()
//     @Transform(({ value }) => value.split(','))
//     filterContracts: string[];
//     @ApiProperty()
//     @Transform(({ value }) => value.split(','))
//     filterChains: string[];
// }

// export class MysteryBoxFilters {
//     @ApiProperty()
//     ownerAddress: string | null;
//     @ApiProperty()
//     chain: string | null;
//     @ApiProperty()
//     cardLevel: number | null;
// }

// export class VoteFilters {
//     @ApiProperty()
//     @Transform(({ value }) => value.split(','))
//     filterChains: string[];
//     @ApiProperty()
//     voterAddress: string;
// }
