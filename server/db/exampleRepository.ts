export type ExampleRecord = {
  id: string;
};

export function createExampleRecord(id: string): ExampleRecord {
  return { id };
}
