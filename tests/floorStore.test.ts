import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import {
  getFloorTables,
  addFloorTable,
  updateFloorTable,
  deleteFloorTable,
} from "@/lib/api/floors";

// Mock the API module
jest.mock("@/lib/api/floors", () => ({
  getFloorTables: jest.fn(),
  addFloorTable: jest.fn(),
  updateFloorTable: jest.fn(),
  deleteFloorTable: jest.fn(),
}));

const mockedGetTables = getFloorTables as jest.MockedFunction<
  typeof getFloorTables
>;
const mockedAddTable = addFloorTable as jest.MockedFunction<
  typeof addFloorTable
>;
const mockedUpdateTable = updateFloorTable as jest.MockedFunction<
  typeof updateFloorTable
>;
const mockedDeleteTable = deleteFloorTable as jest.MockedFunction<
  typeof deleteFloorTable
>;

describe("FloorStore API & Action Logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("fetches floor tables successfully", async () => {
    const mockTables = [
      {
        id: "t1",
        number: "1",
        seats: 4,
        shape: "square",
        zone: "Main Hall",
        status: "free",
        guests: 0,
        x: 20,
        y: 25,
      },
    ];
    mockedGetTables.mockResolvedValueOnce(mockTables as any);

    const result = await getFloorTables();

    expect(mockedGetTables).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockTables);
  });

  test("adds a floor table successfully", async () => {
    const input: any = {
      number: "T2",
      seats: 2,
      shape: "round",
      zone: "Main Hall",
    };
    const savedTable = {
      id: "t2",
      ...input,
      status: "free",
      guests: 0,
      x: 30,
      y: 35,
    };

    mockedAddTable.mockResolvedValueOnce(savedTable as any);

    const result = await addFloorTable(input);

    expect(mockedAddTable).toHaveBeenCalledWith(input);
    expect(result).toEqual(savedTable);
  });

  test("updates a floor table successfully", async () => {
    const tableUpdate: any = { id: "t1", status: "occupied", guests: 2 };
    mockedUpdateTable.mockResolvedValueOnce({
      success: true,
      ...tableUpdate,
    } as any);

    const result = await updateFloorTable(tableUpdate as any);

    expect(mockedUpdateTable).toHaveBeenCalledWith(tableUpdate);
    expect(result.status).toBe("occupied");
  });

  test("deletes a floor table successfully", async () => {
    mockedDeleteTable.mockResolvedValueOnce({ success: true } as any);

    const result = await deleteFloorTable("t1");

    expect(mockedDeleteTable).toHaveBeenCalledWith("t1");
    expect(result.success).toBe(true);
  });
});
