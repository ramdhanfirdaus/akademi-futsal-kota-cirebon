import api from "@/services/api";
import { ApiResponse } from "@/types.ts";

export type GalleryItem = { id: number; caption: string | null; url: string; created_at: string };

class GalleryService {
    async list(): Promise<ApiResponse<GalleryItem[]>> {
        return await api.get("/gallery");
    }

    async add(photo: string, caption?: string): Promise<ApiResponse<GalleryItem>> {
        return await api.post("/gallery", { photo, caption });
    }

    async updateCaption(id: number, caption: string): Promise<ApiResponse<GalleryItem>> {
        return await api.patch(`/gallery/${id}`, { caption });
    }

    async remove(id: number): Promise<void> {
        await api.delete(`/gallery/${id}`);
    }
}

export default new GalleryService();
