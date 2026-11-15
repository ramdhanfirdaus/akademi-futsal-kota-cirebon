import api from "@/services/api";

class ProfileService {
    async changePassword(oldPassword: string, newPassword: string): Promise<void> {
        await api.put("/me/password", { old_password: oldPassword, new_password: newPassword });
    }
}

export default new ProfileService();
