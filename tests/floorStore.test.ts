import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import {
  getFloorTablesApi,
  addFloorTableApi,
  updateFloorTableApi,
  deleteFloorTableApi,
  bulkUpdateFloorTablesApi,
} from "@/lib/api/floors";

// Mock the API module with the correct API function names
jest.mock("@/lib/api/floors", () => ({
  getFloorTablesApi: jest.fn(),
  addFloorTableApi: jest.fn(),
  updateFloorTableApi: jest.fn(),
  deleteFloorTableApi: jest.fn(),
  bulkUpdateFloorTablesApi: jest.fn(),
}));

const mockedGetTables = getFloorTablesApi as jest.MockedFunction<
  typeof getFloorTablesApi
>;
const mockedAddTable = addFloorTableApi as jest.MockedFunction<
  typeof addFloorTableApi
>;
const mockedUpdateTable = updateFloorTableApi as jest.MockedFunction<
  typeof updateFloorTableApi
>;
const mockedDeleteTable = deleteFloorTableApi as jest.MockedFunction<
  typeof deleteFloorTableApi
>;
const mockedBulkUpdate = bulkUpdateFloorTablesApi as jest.MockedFunction<
  typeof bulkUpdateFloorTablesApi
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

    const result = await getFloorTablesApi();

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

    const result = await addFloorTableApi(input);

    expect(mockedAddTable).toHaveBeenCalledWith(input);
    expect(result).toEqual(savedTable);
  });

  test("updates a floor table successfully", async () => {
    const tableUpdate: any = { id: "t1", status: "occupied", guests: 2 };
    mockedUpdateTable.mockResolvedValueOnce({
      success: true,
      ...tableUpdate,
    } as any);

    const result = await updateFloorTableApi(tableUpdate as any);

    expect(mockedUpdateTable).toHaveBeenCalledWith(tableUpdate);
    expect(result.status).toBe("occupied");
  });

  test("deletes a floor table successfully", async () => {
    mockedDeleteTable.mockResolvedValueOnce({ success: true } as any);

    const result = await deleteFloorTableApi("t1");

    expect(mockedDeleteTable).toHaveBeenCalledWith("t1");
    expect(result.success).toBe(true);
  });

  test("bulk updates floor tables successfully", async () => {
    const tablesList = [{ id: "t1", x: 50, y: 50 }];
    mockedBulkUpdate.mockResolvedValueOnce({
      success: true,
      tables: tablesList,
    } as any);

    const result = await bulkUpdateFloorTablesApi(tablesList as any);

    expect(mockedBulkUpdate).toHaveBeenCalledWith(tablesList);
    expect(result.success).toBe(true);
  });
});
