import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { Account } from "./account.entity";
import { Curation } from "./curation.entity";

@Entity("vote", { schema: "public" })
export class Vote {
    @PrimaryColumn({ type: "text", name: "voter_address" })
    voterAddress: string;

    @PrimaryColumn("text", { name: "curation_hash" })
    curationHash: string;

    @Column("bigint", { name: "voter_id" })
    voterId: number;

    @Column("boolean")
    accept: boolean;

    @Column("boolean", { default: false })
    bet: boolean;

    @Column("boolean", { name: "vpc_redeemed", default: false })
    vpcRedeemed: boolean;

    @Column("boolean", { name: "vpc_redeemable", default: false })
    vpcRedeemable: boolean;

    @Column("integer")
    amount: number;

    @Column("integer")
    duration: number;

    @Column("integer")
    apr: number;

    @Column("boolean", { name: "leverage_lending" })
    leverageLending: boolean;

    @Column("timestamp without time zone", { name: "vote_time" })
    voteTime: Date;

    @Column("integer", { name: "card_level" })
    cardLevel: number;

    @Column("text", { name: "card_id" })
    cardId: string;

    // ----- AUDIT PURPOSES -----
    // Chain that this vote was recorded on
    @Column("text", { default: "rinkeby" })
    chain: string;

    // Contract that this vote was recorded on
    @Column("text", { name: "curation_contract_addess" })
    curationContractAddress: string;
    // -------------------------

    @Column("boolean", { name: "is_winning_vote", nullable: true })
    isWinningVote: boolean;

    @Column("text", { name: "rewarded_amount", nullable: true })
    rewardedAmount: string;

    @Column("numeric", { name: "rewarded_amount_usd", nullable: true })
    rewardedAmountUsd: number;

    @Column("boolean", { name: "reward_claimed", default: false })
    rewardClaimed: boolean;
    
    @Column("text", { name: "winning_price", nullable: true })
    winningPrice: string;

    @Column("text", { name: "tx_id", nullable: true })
    txId: string;

    @ManyToOne(() => Curation, c => c.votes, {onDelete:'SET NULL'})
    @JoinColumn({ name: "curation_hash", referencedColumnName: "hash" })
    curation: Curation;

    @ManyToOne(() => Account, (account) => account.votes, {onDelete:'SET NULL'})
    @JoinColumn([{ name: "voter_id", referencedColumnName: "id" }])
    voter: Account;
}