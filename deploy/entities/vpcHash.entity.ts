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

@Entity("vpc_hash", { schema: "public" })
export class VpcHash {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: number;
    
  @Column("text", { name: "chain", nullable: true })
  chain: string;

  @Column("integer", { name: "card_level", nullable: true })
  cardLevel: number;
  
  @Column("integer", { name: "card_id", nullable: true })
  cardId: number;

  @Column("text", { name: "token_hash", nullable: true })
  tokenHash: string;
}