import { apiErrorMessage } from '@/services/errors';
import React, { useState, useEffect, useCallback } from 'react';
import {
    Search,
    Trash2,
    Edit2,
    RotateCcw,
    Plus,
    Users,
    UserSquare2
} from 'lucide-react';
import { ApiResponse, Coach, CoachFilters, Meta } from '@/types.ts';
import { CoachCard, CoachForm } from "./";
import {
    EmptyState,
    BaseButton,
    AppHeader,
    SearchInput,
    LoadingSpinner,
    Badge,
    DataTableFooter,
    useNotification,
    ConfirmModal
} from "@/components";
import { CoachService } from "@/services";
import { classLabel } from '@/lib/format';

const Coaches: React.FC = () => {
    const { showNotification } = useNotification();
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCoach, setEditingCoach] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Coach | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchInput, setSearchInput] = useState({
        name: '',
        nickname: ''
    });
    const [filters, setFilters] = useState<CoachFilters>({
        name: '',
        nickname: '',
        limit: 10,
        page: 1
    });
    const [pagination, setPagination] = useState<Meta>({
        page: 1,
        last_page: 1,
        total: 0
    });

    const fetchCoaches = useCallback(async (currentFilters: CoachFilters) => {
        setIsLoading(true);
        try {
            const response: ApiResponse<Coach[]> = await CoachService.getCoaches(currentFilters);
            setCoaches(response.data);
            if (response.meta) setPagination(response.meta);
        } catch (e) {
            showNotification({ type: 'error', message: apiErrorMessage(e) })
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCoaches(filters);
    }, [filters, fetchCoaches]);

    const handleSearch = () => {
        setFilters(prev => ({
            ...prev,
            ...searchInput,
            page: 1
        }));
    };

    const handleReset = () => {
        const resetValues = {name: '', nickname: ''};
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
            await CoachService.deleteCoach(String(deleteTarget.id));
            showNotification({ type: 'success', message: 'Berhasil menghapus pelatih' });
            fetchCoaches(filters);
            setDeleteTarget(null);
        } catch (e: any) {
            showNotification({ type: 'error', message: apiErrorMessage(e) });
        } finally {
            setIsDeleting(false);
        }
    };


    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCoach?.name) return;

        setIsSaving(true);
        try {
            if (editingCoach.id) {
                await CoachService.updateCoach(editingCoach.id, editingCoach);
                showNotification({ type: 'success', message: 'Berhasil memperbaharui pelatih',})
            } else {
                await CoachService.createCoach(editingCoach);
                showNotification({ type: 'success', message: 'Berhasil menambahkan pelatih',})
            }

            setIsFormOpen(false);
            setEditingCoach(null);
            fetchCoaches(filters);
        } catch (e: any) {
            showNotification({ type: 'error', message: apiErrorMessage(e) })
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header & Main Controls */}
            <AppHeader
                title="Daftar Pelatih"
                subtitle="Pengelolaan pelatih akademi"
                actions={[
                    {
                        label: "Tambah Pelatih",
                        icon: Plus,
                        onClick: () => {
                            setEditingCoach({
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
                            icon={Users}
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
                    <LoadingSpinner text="Memuat siswa pelatih.."/>
                ) : coaches.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-100 py-6">
                        <EmptyState
                            title="Tidak ada pelatih ditemukan"
                            description="Coba ubah filter pencarian Anda atau tambahkan pelatih baru."
                            onReset={handleReset}
                            icon={UserSquare2}
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
                                        <th className="px-6 py-4 text-md tracking-widest text-center">Kelas</th>
                                        <th className="px-6 py-4 text-md tracking-widest text-center">Aksi</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                    {coaches.map((coach) => (
                                        <tr
                                            key={coach.id}
                                            className="hover:bg-blue-50/20 transition-all group"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-blue-50 flex items-center justify-center text-sm font-black text-blue-600">
                                                        {coach.photo_url ? (
                                                            <img src={coach.photo_url} alt="" className="h-full w-full object-cover" />
                                                        ) : (
                                                            coach.name.split(/\s+/).slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join("")
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-sm">{coach.name}</p>
                                                        <p className="text-sm text-slate-400 font-medium">Coach {coach.nickname}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="grid grid-cols-3 gap-2">
                                                    {coach.classes?.map((item) => (
                                                        <Badge key={item.id} title={classLabel(item.name)}/>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <BaseButton
                                                        onClick={() => {
                                                            setEditingCoach(coach);
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
                                                        onClick={() => setDeleteTarget(coach)}
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
                                {coaches.map((coach) => (
                                    <CoachCard
                                        key={coach.id}
                                        coach={coach}
                                        onEdit={(coach) => {
                                            setEditingCoach(coach);
                                            setIsFormOpen(true);
                                        }}
                                        onDelete={(coach) => setDeleteTarget(coach)}
                                    />
                                ))}
                            </div>
                    </>
                )}

                {/* Enhanced Pagination Footer */}
                <DataTableFooter
                    entityName="Pelatih"
                    page={pagination.page}
                    lastPage={pagination.last_page}
                    total={pagination.total}
                    limit={filters.limit}
                    onPageChange={(page) => setFilters(f => ({...f, page}))}
                    onLimitChange={(limit) => setFilters(f => ({...f, limit, page: 1}))}
                />
            </div>

            {isFormOpen &&
                <CoachForm
                    open={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    isSaving={isSaving}
                    onSubmit={handleSave}
                    coach={editingCoach}
                    setCoach={setEditingCoach}
                />
            }

            <ConfirmModal
                open={!!deleteTarget}
                title="Hapus Pelatih"
                description={`Yakin ingin menghapus Coach ${deleteTarget?.name}?`}
                confirmText="Hapus"
                variant="danger"
                isLoading={isDeleting}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            />
        </div>
    );
};

export default Coaches;
