import api from "@/services/api";
import { ApiResponse } from "@/types.ts";

export type BoardColumn = { id: number; name: string; students: { id: number; name: string; nickname: string | null }[] };

class ClassBoardService {
    async getBoard(): Promise<ApiResponse<BoardColumn[]>> {
        return await api.get("/class-board");
    }

    /** All-or-nothing: returns the refreshed board. */
    async save(moves: { student_id: number; class_id: number }[]): Promise<ApiResponse<{ moved: number; board: BoardColumn[] }>> {
        return await api.put("/class-board", { moves });
    }
}

export default new ClassBoardService();
