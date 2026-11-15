import React, { useRef, useState } from "react";
import { ImagePlus, Trash2, User } from "lucide-react";
import { BaseModal, BaseButton, FormInput } from "@/components";
import FormTextarea from "@/components/Form/FormTextarea";
import { resizeImage } from "@/lib/image";

interface CoachFormClass {
    id?: number;
    username?: string;
    password?: string;
    name?: string;
    nickname?: string;
    experience?: string | null;
    certifications?: string[];
    photo_url?: string | null;
    /** Only sent when changed: a data URL replaces the photo, null removes it. */
    photo?: string | null;
}

interface CoachFormProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    isSaving?: boolean;

    coach: CoachFormClass;
    setCoach: React.Dispatch<React.SetStateAction<CoachFormClass>>;
}

export default function CoachForm({
    open,
    onClose,
    onSubmit,
    isSaving,
    coach,
    setCoach,
}: CoachFormProps) {
    const handleChange = (key: keyof CoachFormClass, value: any) => {
        setCoach(prev => ({
            ...prev,
            [key]: value,
        }));
    };

    const fileInput = useRef<HTMLInputElement>(null);
    const [photoError, setPhotoError] = useState("");
    const preview = coach.photo !== undefined ? coach.photo : coach.photo_url;

    const pickPhoto = async (file: File | undefined) => {
        setPhotoError("");
        if (!file) return;
        try {
            handleChange("photo", await resizeImage(file));
        } catch (err) {
            setPhotoError(err instanceof Error ? err.message : "Foto tidak bisa dibaca");
        } finally {
            if (fileInput.current) fileInput.current.value = "";
        }
    };

    return (
        <BaseModal
            open={open}
            onClose={onClose}
            title={coach?.id ? "Edit Data Pelatih" : "Tambah Pelatih Baru"}
            subtitle="AFKC Hub"
        >
            <form
                onSubmit={(e) => {
                    onSubmit(e);
                }}
                className="p-6 space-y-5 max-h-[80vh] overflow-y-auto"
            >
                <div className="flex items-center gap-4">
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100 flex items-center justify-center">
                        {preview ? (
                            <img src={preview} alt="Foto pelatih" className="h-full w-full object-cover" />
                        ) : (
                            <User className="text-slate-400" size={36} aria-hidden />
                        )}
                    </div>
                    <div className="space-y-2">
                        <p className="text-sm font-black uppercase">Foto</p>
                        <div className="flex flex-wrap gap-2">
                            <BaseButton type="button" size="sm" variant="soft-primary" icon={ImagePlus} onClick={() => fileInput.current?.click()}>
                                {preview ? "Ganti foto" : "Pilih foto"}
                            </BaseButton>
                            {preview && (
                                <BaseButton type="button" size="sm" variant="soft-danger" icon={Trash2} onClick={() => handleChange("photo", null)}>
                                    Hapus foto
                                </BaseButton>
                            )}
                        </div>
                        <p className="text-xs text-slate-500">JPG, PNG, atau WebP. Foto otomatis diperkecil sebelum disimpan.</p>
                        {photoError && <p className="text-xs text-red-600">{photoError}</p>}
                        <input
                            ref={fileInput}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => pickPhoto(e.target.files?.[0])}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                        label="Username"
                        disabled
                        value={coach.username || "(dibuat otomatis)"}
                        onChange={() => {}}
                    />

                    <FormInput
                        label="Password"
                        required={coach.id === undefined}
                        value={coach.password || ""}
                        onChange={(v) => handleChange("password", v.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                        label="Nama"
                        required
                        value={coach.name || ""}
                        onChange={(v) => handleChange("name", v.target.value)}
                    />

                    <FormInput
                        label="Panggilan"
                        required
                        value={coach.nickname || ""}
                        onChange={(v) => handleChange("nickname", v.target.value)}
                    />
                </div>

                <FormTextarea
                    label="Pengalaman"
                    rows={3}
                    maxLength={2000}
                    placeholder="contoh: Melatih futsal usia muda sejak 2015, mantan pemain tim Porda Kota Cirebon."
                    value={coach.experience || ""}
                    onChange={(v) => handleChange("experience", v.target.value)}
                />

                <div className="space-y-1">
                    <FormTextarea
                        label="Sertifikasi"
                        rows={3}
                        placeholder={"contoh:\nLisensi D Pelatih Futsal\nPelatih Kiper Level 1"}
                        value={(coach.certifications ?? []).join("\n")}
                        onChange={(v) => handleChange("certifications", v.target.value.split("\n"))}
                    />
                    <p className="px-2 text-xs text-slate-500">Tulis satu sertifikasi per baris (maksimal 20).</p>
                </div>

                <div className="flex gap-3 pt-6 sticky bottom-0 bg-white">
                    <BaseButton
                        type="button"
                        variant="secondary"
                        className="flex-1"
                        onClick={onClose}
                    >
                        Batal
                    </BaseButton>

                    <BaseButton
                        type="submit"
                        className="flex-[2]"
                        disabled={isSaving}
                    >
                        {isSaving ? "Menyimpan..." : "Simpan Data"}
                    </BaseButton>
                </div>
            </form>
        </BaseModal>
    );
}
