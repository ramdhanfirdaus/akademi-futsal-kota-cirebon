import React from "react";
import {
    BaseModal,
    BaseButton,
    FormInput,
    FormSelect,
    FormTextarea,
    FormCheckbox
} from "@/components";

interface StudentFormClass {
    id?: number;
    username?: string;
    password?: string;
    name?: string;
    nickname?: string;
    birth_place?: string;
    birth_date?: string;
    gender?: string;
    address?: string;
    blood_type?: string;
    disease_history?: string;
    class_id?: number;
    position?: string;
    is_goalkeeper?: boolean;
    year_join?: string;
    parent_name?: string;
    parent_phone?: string;
}

interface Option {
    id?: number;
    name: string;
}

interface StudentFormProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    isSaving?: boolean;

    student: StudentFormClass;
    setStudent: React.Dispatch<React.SetStateAction<StudentFormClass>>;

    classes: Option[];
    genders: Option[];
    bloodTypes: Option[];
    positions: Option[];
}

export default function StudentForm({
    open,
    onClose,
    onSubmit,
    isSaving,
    student,
    setStudent,
    classes,
    genders,
    bloodTypes,
    positions,
}: StudentFormProps) {
    const handleChange = (key: keyof StudentFormClass, value: any) => {
        setStudent(prev => ({
            ...prev,
            [key]: value,
        }));
    };

    return (
        <BaseModal
            open={open}
            onClose={onClose}
            title={student?.id ? "Edit Data Siswa" : "Tambah Siswa Baru"}
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
                        value={student.username || "(dibuat otomatis)"}
                        onChange={() => {}}
                    />

                    <FormInput
                        label="Password"
                        required={student.id === undefined}
                        value={student.password || ""}
                        onChange={(v) => handleChange("password", v.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                        label="Nama"
                        required
                        value={student.name || ""}
                        onChange={(v) => handleChange("name", v.target.value)}
                    />

                    <FormInput
                        label="Panggilan"
                        required
                        value={student.nickname || ""}
                        onChange={(v) => handleChange("nickname", v.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                        label="Tempat Lahir"
                        value={student.birth_place || ""}
                        onChange={(v) => handleChange("birth_place", v.target.value)}
                    />

                    <FormInput
                        type="date"
                        label="Tanggal Lahir"
                        value={student.birth_date?.slice(0, 10) || ""}
                        onChange={(v) => handleChange("birth_date", v.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormSelect
                        label="Jenis Kelamin"
                        value={student.gender ?? ""}
                        options={genders}
                        onChange={(v) => handleChange("gender", v.target.value)}
                    />

                    <FormSelect
                        label="Golongan Darah"
                        value={student.blood_type ?? ""}
                        options={bloodTypes}
                        onChange={(v) => handleChange("blood_type", v.target.value)}
                    />
                </div>

                <FormTextarea
                    label="Alamat"
                    value={student.address || ""}
                    onChange={(v) => handleChange("address", v.target.value)}
                />

                <FormTextarea
                    label="Riwayat Penyakit"
                    value={student.disease_history || ""}
                    onChange={(v) => handleChange("disease_history", v.target.value)}
                />

                <div className="pt-4 border-t">
                    <h4 className="text-xs font-black uppercase mb-3">
                        Informasi Akademik
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <FormSelect
                            label="Kelas"
                            required
                            value={student.class_id ?? ""}
                            options={classes}
                            onChange={(v) => handleChange("class_id", Number(v.target.value))}
                        />

                        <div className="relative">
                            <FormSelect
                                label="Posisi"
                                required
                                value={student.position ?? ""}
                                options={positions}
                                onChange={(v) => handleChange("position", v.target.value)}
                            />

                            {student.position && student.position != 'KIPER' && (
                                <FormCheckbox
                                    label="Posisi Kiper Juga"
                                    helperText="Centang jika pemain juga mengikuti latihan kiper"
                                    checked={student.is_goalkeeper ?? false}
                                    onChange={(e) =>
                                        handleChange("is_goalkeeper", e.target.checked)
                                    }
                                />
                            )}
                        </div>
                    </div>

                    <FormInput
                        label="Tahun Gabung"
                        required
                        value={student.year_join || ""}
                        onChange={(v) => handleChange("year_join", v.target.value)}
                    />
                </div>

                <div className="pt-4 border-t">
                    <h4 className="text-xs font-black uppercase mb-3">
                        Informasi Wali
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput
                            label="Nama Orang Tua"
                            value={student.parent_name || ""}
                            onChange={(v) => handleChange("parent_name", v.target.value)}
                        />

                        <FormInput
                            label="Telepon Orang Tua"
                            value={student.parent_phone || ""}
                            onChange={(v) => handleChange("parent_phone", v.target.value)}
                        />
                    </div>
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
