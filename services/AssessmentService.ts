import api from '@/services/api';
import type { ApiResponse } from '@/types.ts';
import type { Grade, TemplateField, Track } from '@/lib/assessment';
import type { SemesterDTO } from '@/server/services/assessments/semesters';
import type { GridRow } from '@/server/services/assessments/grades';
import type { PublishSummary, ResultRow } from '@/server/services/assessments/publish';
import type { TemplateMeta } from '@/server/services/assessments/templates';
import type { CertificateInputJson, MyGradesSemester } from '@/server/services/assessments/certificates';

export type { SemesterDTO, GridRow, PublishSummary, ResultRow, TemplateMeta, CertificateInputJson, MyGradesSemester };
export type GradeGrid = { aspects: { id: number; name: string }[]; rows: GridRow[] };

const base = (id: number) => `/assessments/semesters/${id}`;

class AssessmentService {
  listSemesters(): Promise<ApiResponse<SemesterDTO[]>> {
    return api.get('/assessments/semesters');
  }
  createSemester(body: { name: string; number_format: string }): Promise<ApiResponse<SemesterDTO>> {
    return api.post('/assessments/semesters', body);
  }
  getSemester(id: number): Promise<ApiResponse<SemesterDTO>> {
    return api.get(base(id));
  }
  updateSemester(id: number, body: { name?: string; number_format?: string; certificate_date?: string | null }): Promise<ApiResponse<SemesterDTO>> {
    return api.patch(base(id), body);
  }
  async deleteSemester(id: number): Promise<void> {
    await api.delete(base(id));
  }
  saveAspects(id: number, track: Track, aspects: { id?: number; name: string }[]): Promise<ApiResponse<SemesterDTO>> {
    return api.put(`${base(id)}/aspects`, { track, aspects });
  }
  getGrid(id: number, classId: number, track: Track): Promise<ApiResponse<GradeGrid>> {
    return api.get(`${base(id)}/grades`, { params: { class_id: classId, track } });
  }
  saveGrades(
    id: number,
    body: { class_id: number; track: Track; rows: { student_id: number; scores: Record<string, Grade | null> }[] },
  ): Promise<ApiResponse<{ saved: number }>> {
    return api.put(`${base(id)}/grades`, body);
  }
  importGrades(
    id: number,
    body: { class_id: number; track: Track; dry_run?: boolean; rows: { _row: number; username: string; scores: Record<string, unknown> }[] },
  ): Promise<ApiResponse<{ dry_run: boolean; count: number }>> {
    return api.post(`${base(id)}/grades/import`, body);
  }
  publishSummary(id: number): Promise<ApiResponse<PublishSummary>> {
    return api.get(`${base(id)}/publish`);
  }
  publish(id: number): Promise<ApiResponse<SemesterDTO>> {
    return api.post(`${base(id)}/publish`);
  }
  unpublish(id: number): Promise<ApiResponse<SemesterDTO>> {
    return api.delete(`${base(id)}/publish`);
  }
  results(id: number): Promise<ApiResponse<ResultRow[]>> {
    return api.get(`${base(id)}/results`);
  }
  getTemplate(id: number, track: Track): Promise<ApiResponse<TemplateMeta | null>> {
    return api.get(`${base(id)}/templates/${track}`);
  }
  saveTemplateFields(id: number, track: Track, fields: TemplateField[]): Promise<ApiResponse<TemplateMeta>> {
    return api.put(`${base(id)}/templates/${track}`, { fields });
  }
  uploadTemplateImage(id: number, track: Track, body: { image: string; width_px: number; height_px: number }): Promise<ApiResponse<TemplateMeta>> {
    return api.put(`${base(id)}/templates/${track}/image`, body);
  }
  async deleteAssessment(assessmentId: number): Promise<void> {
    await api.delete(`/assessments/${assessmentId}`);
  }
  certificateUrl(assessmentId: number): string {
    return `/api/assessments/${assessmentId}/certificate`;
  }
  certificateInput(assessmentId: number): Promise<ApiResponse<CertificateInputJson>> {
    return api.get(`/assessments/${assessmentId}/certificate-input`);
  }
  myGrades(): Promise<ApiResponse<MyGradesSemester[]>> {
    return api.get('/me/grades');
  }
}

export default new AssessmentService();
