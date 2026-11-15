import api from "@/services/api";
import {Class, ApiResponse, Coach} from "@/types.ts";

class ClassService {
    async getClasses(): Promise<ApiResponse<Class[]>> {
        return await api.get("/classes");
    }

    async createClass(payload: Partial<Class>): Promise<void> {
        const response = await api.post("/classes", payload);
        return response.data.data;
    }

    async updateClass(id: number, payload: Partial<Class>): Promise<void> {
        const response = await api.put(`/classes/${id}`, payload);
        return response.data.data;
    }

    async deleteClass(id: number): Promise<void> {
        await api.delete(`/classes/${id}`);
    }
}

export default new ClassService();
