/**
 * Format tanggal ke format Indonesia
 * contoh: 01 Mei 2010
 */
export const formatDate = (date?: string): string => {
    if (!date) return '-';

    // Aman dari bug timezone (ISO Z)
    const safeDate = date.split('T')[0];

    return new Date(safeDate).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
};

/**
 * Hitung umur dari tanggal lahir
 */
export const getAge = (birthDate?: string): number => {
    if (!birthDate) return 0;

    const safeDate = birthDate.split('T')[0];
    const birth = new Date(safeDate);
    const today = new Date();

    let age = today.getFullYear() - birth.getFullYear() + 1;
    const m = today.getMonth() - birth.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age;
};
