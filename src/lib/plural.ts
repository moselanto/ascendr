/** "1 member", "2 members", "0 members". */
export function memberLabel(n: number | null | undefined): string {
  const count = n ?? 0;
  return `${count.toLocaleString("en-US")} ${count === 1 ? "member" : "members"}`;
}
