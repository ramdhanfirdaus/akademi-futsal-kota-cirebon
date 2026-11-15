import React from "react";
import { BaseModal, BaseButton, FormInput } from "@/components";

interface CoachFormClass {
    id?: number;
    username?: string;
    password?: string;
    name?: string;
    nickname?: string;
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
