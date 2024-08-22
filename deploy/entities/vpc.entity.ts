import { Account } from "./account.entity";
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from "typeorm";
import { BigNumber } from "ethers";
import { Collection } from "./collection.entity";
import { AssetTrait, KeyValuePair } from "../models/models";
import { OrderOffer } from "./orderOffer.entity";
import { MarketplaceOrder } from "./marketplaceOrder.entity";
import { Curation } from "./curation.entity";

@Entity("vpc", { schema: "public" })
export class Vpc {

  @PrimaryColumn("integer", { name: "level" })
  level: number;

  @PrimaryColumn("text", { name: "chain" })
  chain: string | null;

  @Column("text", { name: "token_address" })
  tokenAddress: string | null;

  @Column("integer", { name: "type", nullable: true })
  type: number | null;

  @Column("text", { name: "image_url", nullable: true })
  imageUrl: string | null;

  @Column("text", { name: "name", nullable: true })
  name: string | null;

  @Column("text", { name: "description", nullable: true })
  description: string | null;

  @Column("text", { name: "price", nullable: true })
  price: string | null;

  @Column("decimal", { precision: 40, name: "price_ordinal", nullable: true })
  priceOrdinal: BigNumber | null;

  @Column("text", { name: "price_token", nullable: true })
  priceToken: string;

  @Column("integer", { name: "last_sync_block_number", nullable: true })
  lastSyncBlockNum: number;
}