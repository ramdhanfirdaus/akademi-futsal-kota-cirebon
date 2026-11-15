import api from "@/services/api";
import { ApiResponse, HolidayPeriod } from "@/types.ts";

class HolidayService {
    async getHolidays(): Promise<ApiResponse<HolidayPeriod[]>> {
        return await api.get("/holiday-periods");
    }

    /** `period` as YYYY-MM. */
    async createHoliday(period: string): Promise<ApiResponse<HolidayPeriod>> {
        return await api.post("/holiday-periods", { period });
    }

    async deleteHoliday(id: number): Promise<void> {
        await api.delete(`/holiday-periods/${id}`);
    }
}

export default new HolidayService();
