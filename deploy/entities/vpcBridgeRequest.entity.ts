import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Account } from "./account.entity";

@Entity("vpc_bridge_request", { schema: "public" })
export class VPCBridgeRequest {
    @PrimaryColumn("integer", { name: "source_chain_id" })
    sourceChainId: number;

    @PrimaryColumn("text")
    nonce: string;

    @Column("integer", { name: "target_chain_id" })
    targetChainId: number;

    @Column("text", { name: "sender_address" })
    senderAddress: string;

    @Column("text", { name: "recipient_address" })
    recipientAddress: string;

    @Column("integer", { name: "card_level" })
    cardLevel: number;

    @Column("text", { name: "token_id" })
    tokenId: string;

    @Column("boolean")
    revealed: boolean;

    @Column("text", { name: "token_hash" })
    tokenHash: string;
    
    @Column("text")
    signature: string;

    @Column("boolean")
    processed: boolean;

    @Column("timestamp without time zone", { name: "requested_at" })
    requestedAt: Date;

    @Column("timestamp without time zone", { name: "processed_at", nullable: true })
    processedAt: Date;

    @ManyToOne(() => Account, (account) => account.vpcBridgeRequests)
    @JoinColumn([{ name: "sender_id", referencedColumnName: "id" }])
    sender: Account;

}