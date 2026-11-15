import api from "@/services/api";
import { Student, StudentFilters, ApiResponse } from "@/types.ts";

class StudentService {
    async getStudents(filters: StudentFilters): Promise<ApiResponse<Student[]>> {
        return await api.get("/students", {
            params: filters,
        });
    }

    async createStudent(payload: Partial<Student>): Promise<Student> {
        const response = await api.post("/students", payload);
        return response.data.data;
    }

    async updateStudent(id: string, payload: Partial<Student>): Promise<Student> {
        const response = await api.put(`/students/${id}`, payload);
        return response.data.data;
    }

    async deleteStudent(id: string): Promise<void> {
        await api.delete(`/students/${id}`);
    }
}

export default new StudentService();
