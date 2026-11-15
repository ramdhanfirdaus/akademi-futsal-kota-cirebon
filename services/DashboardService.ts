import api from "@/services/api";
import { ApiResponse, DashboardSummary, StudentDashboard } from "@/types.ts";

class DashboardService {
    async getSummaries(): Promise<ApiResponse<DashboardSummary>> {
        return await api.get("/dashboard/summary");
    }

    async getStudentDashboard(): Promise<ApiResponse<StudentDashboard>> {
        return await api.get("/dashboard/student");
    }
}

export default new DashboardService();
