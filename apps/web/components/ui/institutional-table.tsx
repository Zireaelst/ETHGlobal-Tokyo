import type { ReactNode } from "react";
import styles from "./institutional-table.module.css";

type InstitutionalTableProps = {
  caption: string;
  columns: readonly string[];
  rows: readonly (readonly ReactNode[])[];
};

export function InstitutionalTable({ caption, columns, rows }: InstitutionalTableProps) {
  return (
    <div className={styles.frame}>
      <table>
        <caption>{caption}</caption>
        <thead><tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
        <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
