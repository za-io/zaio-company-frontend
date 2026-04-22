/**
 * Same learner-app assessor URLs as OCModuleDetails (qctolw / qcto-assessment / qcto-pmt).
 * @param {{ kind: 'qctolw' | 'qctosa' | 'qctopmt', id: string, lectureId?: string }} ref
 * @param {string} studentId
 * @param {boolean} readOnly
 * @returns {string | null}
 */
export function buildQctoAssessorUrl(ref, studentId, readOnly) {
  if (!ref?.id || !studentId) return null;
  const baseUrl =
    typeof window !== "undefined" && window.location.hostname === "localhost"
      ? "http://localhost:3000"
      : "https://www.zaio.io";
  const token = typeof window !== "undefined" ? localStorage.getItem("TOKEN") || "" : "";
  const readOnlyParam = readOnly ? "&readOnly=true" : "";
  const lectureIdParam = ref.lectureId
    ? `&lectureId=${encodeURIComponent(ref.lectureId)}`
    : "";

  if (ref.kind === "qctolw") {
    return `${baseUrl}/assessor/qctolw/${ref.id}?studentId=${studentId}&token=${token}${readOnlyParam}${lectureIdParam}`;
  }
  if (ref.kind === "qctosa") {
    return `${baseUrl}/assessor/qcto-assessment/${ref.id}?studentId=${studentId}&token=${token}${readOnlyParam}${lectureIdParam}`;
  }
  if (ref.kind === "qctopmt") {
    return `${baseUrl}/assessor/qcto-pmt/${ref.id}?studentId=${studentId}&token=${token}${readOnlyParam}${lectureIdParam}`;
  }
  return null;
}
