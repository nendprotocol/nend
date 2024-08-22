import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("pool_interest", {schema: "public"})
export class PoolInterest{
    @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
    id: number;

    @Column("decimal", {name:"pool_pct", nullable: true})
    poolPct: number | null;

    @Column("decimal", { name:"lender_pct", nullable: true})
    lenderPct: number | null;

    @Column("decimal", { name:"insurance_vault_pct", nullable: true})
    insuranceVaultPct: number | null;
}