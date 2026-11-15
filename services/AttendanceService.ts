import api from "@/services/api";
import {ApiResponse, Attendance, PaymentStudent} from "@/types.ts";

class AttendanceService {
    async getAttendances(classId: string | number, startDate: string, endDate: string): Promise<ApiResponse<Attendance>> {
        return await api.get("/attendances", {
            params: {
                class_id: classId,
                start: startDate,
                end: endDate
            }
        });
    }

    async saveAttendances(list: Partial<object>): Promise<void> {
        await api.post('/attendances', { list });
    }
}

export default new AttendanceService();
