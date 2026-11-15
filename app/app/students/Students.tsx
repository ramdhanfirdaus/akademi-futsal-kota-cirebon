import React, { useState, useEffect, useCallback } from 'react';
import {
    Search,
    Plus,
    Trash2,
    Edit2,
    RotateCcw,
    Users
} from 'lucide-react';
import {
    Class,
    Student,
    StudentFilters,
    Meta,
    POSITIONS,
    GENDERS,
    BLOOD_TYPES,
    ApiResponse
} from '@/types.ts';
import { StudentService, ClassService } from '@/services';
import { getAge, formatDate } from "@/utils/date.ts";
import {
    EmptyState,
    BaseButton,
    AppHeader,
    SearchInput,
    SelectInput,
    LoadingSpinner,
    Badge,
    DataTableFooter,
    useNotification,
    ConfirmModal
} from "@/components";
import { StudentCard, StudentDetail, StudentForm } from "@/app/app/students";

const Students: React.FC = () => {
    const { showNotification } = useNotification();
    // States
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [searchInput, setSearchInput] = useState({
        name: '',
        nickname: '',
        class: ''
    });
    const [filters, setFilters] = useState<StudentFilters>({
        name: '',
        nickname: '',
        class: '',
        limit: 10,
        page: 1
    });
    const [pagination, setPagination] = useState<Meta>({
        page: 1,
        last_page: 1,
        total: 0
    });

    const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingStudent, setEditingStudent] = useState<any>(null);
    const classOptions = classes.map(cls => ({
        value: cls.id,
        label: cls.name
    }));

    useEffect(() => {
        if (editingStudent?.nickname && !editingStudent?.id) {
            const username = `${editingStudent.nickname.toLowerCase()}0${students.length + 1}`;

            setEditingStudent(prev => ({
                ...prev,
                username,
            }));
        }
    }, [editingStudent?.nickname]);

    const fetchStudents = useCallback(async (currentFilters: StudentFilters) => {
        setIsLoading(true);
        try {
            const response: ApiResponse<Student[]> = await StudentService.getStudents(currentFilters);
            setStudents(response.data);
            setPagination(response.meta);
        } catch (e) {
            showNotification({ type: 'error', message: e.message })
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStudents(filters);
    }, [filters, fetchStudents]);

    const fetchClasses = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await ClassService.getClasses();
            setClasses(response.data);
        } catch (e) {
            showNotification({ type: 'error', message: e.message })
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchClasses();
    }, [fetchClasses]);

    const handleSearch = () => {
        setFilters(prev => ({
            ...prev,
            ...searchInput,
            page: 1
        }));
    };

    const handleReset = () => {
        const resetValues = {name: '', nickname: '', class: ''};
        setSearchInput(resetValues);
        setFilters(prev => ({
            ...prev,
            ...resetValues,
            page: 1
        }));
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;

        setIsDeleting(true);
        try {
            await StudentService.deleteStudent(String(deleteTarget.id));
            fetchStudents(filters);
            showNotification({ type: 'success', message: 'Berhasil menghapus siswa' })
            if (selectedStudent?.id === deleteTarget.id) setSelectedStudent(null);
            setDeleteTarget(null);
        } catch (e) {
            showNotification({ type: 'error', message: e.message })
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStudent?.name) return;

        setIsSaving(true);
        try {
            if (editingStudent.id) {
                await StudentService.updateStudent(editingStudent.id, editingStudent);
                showNotification({ type: 'success', message: 'Berhasil memperbaharui siswa',})
            } else {
                await StudentService.createStudent(editingStudent);
                showNotification({ type: 'success', message: 'Berhasil menambahkan siswa',})
            }
            setIsFormOpen(false);
            setEditingStudent(null);
            fetchStudents(filters);
        } catch (e: any) {
            showNotification({ type: 'error', message: e.message })
        } finally {
            setIsSaving(false);
        }
    };

    if (selectedStudent) {
        return <StudentDetail
            student={selectedStudent}
            onBack={() => setSelectedStudent(null)}
            formatDate={formatDate}
        />;
    }

    return (
        <div className="space-y-6">
            {/* Header & Main Controls */}
            <AppHeader
                title="Daftar Siswa"
                subtitle="Pengelolaan siswa akademi"
                actions={[
                    {
                        label: "Tambah Siswa",
                        icon: Plus,
                        onClick: () => {
                            setEditingStudent({
                                password: "afkc2026"
                            });
                            setIsFormOpen(true);
                        },
                    },
                ]}
            />

            {/* Advanced Filters - Compact Refinement */}
            <div className="bg-white p-4 md:p-5 rounded-3xl border border-slate-100 shadow-md">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                    <div className="space-y-1">
                        <SearchInput
                            value={searchInput.name}
                            onChange={(val) => setSearchInput(s => ({...s, name: val}))}
                            placeholder="Cari Nama..."
                            label="Nama Lengkap"
                            icon={Search}
                        />
                    </div>
                    <div className="space-y-1">
                        <SearchInput
                            value={searchInput.nickname}
                            onChange={(val) => setSearchInput(s => ({...s, nickname: val}))}
                            placeholder="Cari Panggilan..."
                            label="Panggilan"
                            icon={Search}
                        />
                    </div>
                    <div className="space-y-1">
                        <SelectInput
                            value={searchInput.class}
                            onChange={(val) => setSearchInput(s => ({...s, class: val}))}
                            options={classOptions}
                            label="Kelas"
                            icon={Users}
                            placeholder="Semua Kelas"
                            allowEmpty
                        />
                    </div>
                    <div className="flex gap-2">
                        <BaseButton
                            icon={Search}
                            onClick={handleSearch}
                            className="flex-1"
                        >
                            Cari
                        </BaseButton>
                        <BaseButton
                            icon={RotateCcw}
                            onClick={handleReset}
                            className="flex-1"
                            variant="secondary"
                        >
                            Reset
                        </BaseButton>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {/* List Container */}
                {isLoading ? (
                    <LoadingSpinner text="Memuat siswa kelas.."/>
                ) : students.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-100 py-6">
                        <EmptyState
                            icon={Users}
                            title="Tidak ada siswa ditemukan"
                            description="Coba ubah filter pencarian Anda atau tambahkan siswa baru."
                            onReset={handleReset}
                        />
                    </div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div
                            className="hidden md:block bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-md tracking-widest">Nama</th>
                                    <th className="px-6 py-4 text-md tracking-widest">Umur</th>
                                    <th className="px-6 py-4 text-md tracking-widest">Kelas</th>
                                    <th className="px-6 py-4 text-md tracking-widest text-center">Aksi</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                {students.map((student) => (
                                    <tr
                                        key={student.id}
                                        className="hover:bg-blue-50 transition-all cursor-pointer group"
                                        onClick={() => setSelectedStudent(student)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{student.name}</p>
                                                    <p className="text-sm text-slate-400 font-medium">{student.nickname}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge
                                                title={student.birth_date ? `${getAge(student.birth_date)} Tahun` : '-'}/>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge title={`Kelas ${student.academy_students.class.name}`}/>
                                        </td>
                                        <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-1.5">
                                                <BaseButton
                                                    onClick={() => {
                                                        setEditingStudent(student);
                                                        setIsFormOpen(true);
                                                    }}
                                                    className="flex-1"
                                                    size="sm"
                                                    variant="soft-primary"
                                                    icon={Edit2}
                                                >
                                                    EDIT
                                                </BaseButton>
                                                <BaseButton
                                                    onClick={() => setDeleteTarget(student)}
                                                    className="flex-1"
                                                    size="sm"
                                                    variant="soft-danger"
                                                    icon={Trash2}
                                                >
                                                    HAPUS
                                                </BaseButton>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Grid */}
                        <div className="grid md:hidden grid-cols-1 gap-3">
                            {students.map((student) => (
                                <StudentCard
                                    key={student.id}
                                    student={student}
                                    getAge={getAge}
                                    onClick={setSelectedStudent}
                                    onEdit={(s) => {
                                        setEditingStudent(s);
                                        setIsFormOpen(true);
                                    }}
                                    onDelete={(student) => setDeleteTarget(student)}
                                />
                            ))}
                        </div>
                    </>
                )}

                {/* Enhanced Pagination Footer */}
                <DataTableFooter
                    entityName="Siswa"
                    page={pagination.page}
                    lastPage={filters.page}
                    total={pagination.total}
                    limit={filters.limit}
                    onPageChange={(page) => setFilters(f => ({...f, page}))}
                    onLimitChange={(limit) => setFilters(f => ({...f, limit, page: 1}))}
                />
            </div>

            {/* Form Dialog */}
            {isFormOpen && (
                <StudentForm
                    open={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    onSubmit={handleSave}
                    isSaving={isSaving}
                    student={editingStudent}
                    setStudent={setEditingStudent}
                    classes={classes}
                    genders={GENDERS}
                    bloodTypes={BLOOD_TYPES}
                    positions={POSITIONS}
                />
            )}

            <ConfirmModal
                open={!!deleteTarget}
                title="Hapus Pemain"
                description={`Yakin ingin menghapus ${deleteTarget?.name}?`}
                confirmText="Hapus"
                variant="danger"
                isLoading={isDeleting}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            />
        </div>
    );
};

export default Students;
