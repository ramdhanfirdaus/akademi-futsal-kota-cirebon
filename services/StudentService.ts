import api from "@/services/api";
import { Student, StudentFilters, ApiResponse } from "@/types.ts";

export type ImportResult = {
    dry_run: boolean;
    count: number;
    created: { row: number; name: string; username: string; class: string }[];
};

class StudentService {
    async getStudents(filters: StudentFilters): Promise<ApiResponse<Student[]>> {
        return await api.get("/students", {
            params: filters,
        });
    }

    async createStudent(payload: Partial<Student>): Promise<Student> {
        const response = await api.post("/students", payload);
        return (response as unknown as ApiResponse<Student>).data;
    }

    async updateStudent(id: string, payload: Partial<Student>): Promise<Student> {
        const response = await api.put(`/students/${id}`, payload);
        return (response as unknown as ApiResponse<Student>).data;
    }

    /** All-or-nothing import; `dryRun` only validates. Validation problems come back as a 422 with `errors`. */
    async importStudents(rows: Record<string, unknown>[], dryRun: boolean): Promise<ImportResult> {
        const response = await api.post("/students/import", { rows, dry_run: dryRun });
        return (response as unknown as ApiResponse<ImportResult>).data;
    }

    async deleteStudent(id: string): Promise<void> {
        await api.delete(`/students/${id}`);
    }
}

export default new StudentService();
