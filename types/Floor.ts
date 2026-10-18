export type Zone = "Main Hall" | "Patio" | "Bar";

export type TableStatus = "free" | "occupied" | "reserved" | "cleaning";

export type TableShape = "round" | "square" | "rect";

export type FormState = {
  number: string;
  seats: string;
  shape: string;
  zone: string;
};

export type FloorTable = {
  id?: string;
  number: number;
  seats: number;
  shape: TableShape;
  zone: Zone;
  /** Position on the canvas, as a percentage (0–100) of its width/height */
  x: number;
  y: number;
  status: TableStatus;
  /** Guests currently seated; 0 unless the table is occupied */
  guests: number;
};

export type TableInput = Pick<
  FloorTable,
  "number" | "seats" | "shape" | "zone"
>;

export type FormErrors = Partial<Record<keyof FormState, string>>;
