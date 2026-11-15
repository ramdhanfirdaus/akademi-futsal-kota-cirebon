import api from "@/services/api";
import { Coach, CoachFilters, ApiResponse } from "@/types.ts";

class CoachService {
    async getAllCoaches(): Promise<ApiResponse<Coach[]>> {
        return await api.get("/coach-all");
    }

    async getCoaches(filters: CoachFilters): Promise<ApiResponse<Coach[]>> {
        return await api.get("/coaches", {
            params: filters,
        });
    }

    async createCoach(payload: Partial<Coach>): Promise<Coach> {
        const response = await api.post("/coaches", payload);
        return (response as unknown as ApiResponse<Coach>).data;
    }

    async updateCoach(id: string, payload: Partial<Coach>): Promise<Coach> {
        const response = await api.put(`/coaches/${id}`, payload);
        return (response as unknown as ApiResponse<Coach>).data;
    }

    async deleteCoach(id: string): Promise<void> {
        await api.delete(`/coaches/${id}`);
    }
}

export default new CoachService();
