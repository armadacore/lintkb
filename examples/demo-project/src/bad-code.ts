// Intentionally bad code to demonstrate lintkb output.

export function processItem(item: any): void {
  const unused = 42;
  console.log("processing", item);

  if (item == null) {
    return;
  }
}
