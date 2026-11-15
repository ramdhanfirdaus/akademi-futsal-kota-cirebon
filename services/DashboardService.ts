import api from "@/services/api";
import { ApiResponse } from "@/types.ts";

class DashboardService {
    async getSummaries(): Promise<ApiResponse<object>> {
        return await api.get("/dashboard/summary");
    }
}

export default new DashboardService();
