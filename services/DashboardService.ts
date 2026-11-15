import api from "@/services/api";
import { ApiResponse, DashboardSummary, ParticipantStats, StudentDashboard } from "@/types.ts";

class DashboardService {
    async getSummaries(): Promise<ApiResponse<DashboardSummary>> {
        return await api.get("/dashboard/summary");
    }

    async getParticipants(classId?: number): Promise<ApiResponse<ParticipantStats>> {
        return await api.get("/dashboard/participants", { params: classId ? { class_id: classId } : {} });
    }

    async getStudentDashboard(): Promise<ApiResponse<StudentDashboard>> {
        return await api.get("/dashboard/student");
    }
}

export default new DashboardService();
