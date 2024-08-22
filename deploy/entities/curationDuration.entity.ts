import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";


@Entity("curation_duration", { schema: "public" })
export class CurationDuration {
    @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
    id: number;

    @Column("text", { name: "title", nullable: true })
    title: string | null;

    @Column("integer", { name: "num_of_days", nullable: true })
    numOfDays: number | null;
}
