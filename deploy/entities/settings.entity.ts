import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("settings", { schema: "public" })
export class Settings {
  @PrimaryGeneratedColumn({ type: "bigint", name: "id" })
  id: number;

  @Column("text", { name: "key", nullable: true })
  key: string | null;

  @Column("jsonb", { name: "value", nullable: true })
  value: object;
}