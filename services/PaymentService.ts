import api from "@/services/api";
import { ApiResponse, PaymentStudent} from "@/types.ts";

class PaymentService {
    async getPayments(classId: string | number, year: number): Promise<ApiResponse<PaymentStudent[]>> {
        return await api.get("/payments", {
            params: {
                class_id: classId,
                year: year
            }
        });
    }

    async savePayments(classId: string | number, year: number, payload: Partial<PaymentStudent[]>): Promise<void> {
        await api.post('/payments', {
            class_id: classId,
            year: year,
            data: payload
        });
    }
}

export default new PaymentService();
