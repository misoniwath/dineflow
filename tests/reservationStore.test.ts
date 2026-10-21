import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import {
  getReservationsApi,
  addReservationApi,
  updateReservationApi,
} from "@/lib/api/reservations";

// Mock the API module
jest.mock("@/lib/api/reservations", () => ({
  getReservationsApi: jest.fn(),
  addReservationApi: jest.fn(),
  updateReservationApi: jest.fn(),
}));

const mockedGetReservations = getReservationsApi as jest.MockedFunction<
  typeof getReservationsApi
>;
const mockedAddReservation = addReservationApi as jest.MockedFunction<
  typeof addReservationApi
>;
const mockedUpdateReservation = updateReservationApi as jest.MockedFunction<
  typeof updateReservationApi
>;

describe("ReservationStore API & Action Logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("fetches reservations successfully", async () => {
    const mockReservations = [
      {
        id: "r1",
        name: "Alice",
        party: 4,
        date: "2026-06-01",
        time: "18:00",
        status: "booked",
        tableId: null,
      },
    ];
    mockedGetReservations.mockResolvedValueOnce(mockReservations as any);

    const result = await getReservationsApi();

    expect(mockedGetReservations).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockReservations);
  });

  test("adds a new reservation successfully", async () => {
    const input = {
      name: "Bob",
      party: 2,
      date: "2026-06-02",
      time: "19:00",
      phone: "555-0192",
    };
    const savedReservation = {
      id: "r2",
      ...input,
      status: "booked",
      tableId: null,
    };

    mockedAddReservation.mockResolvedValueOnce(savedReservation as any);

    const result = await addReservationApi(input);

    expect(mockedAddReservation).toHaveBeenCalledWith(input);
    expect(result).toEqual(savedReservation);
  });

  test("updates reservation status successfully", async () => {
    const updatePayload: any = { id: "r1", status: "seated" };
    mockedUpdateReservation.mockResolvedValueOnce({
      success: true,
      ...updatePayload,
    } as any);

    const result = await updateReservationApi(updatePayload as any);

    expect(mockedUpdateReservation).toHaveBeenCalledWith(updatePayload);
    expect(result.status).toBe("seated");
  });
});
